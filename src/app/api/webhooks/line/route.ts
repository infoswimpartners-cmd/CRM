import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendGoogleChatMessage } from '@/lib/google-chat'

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || process.env.LINE_CLIENT_SECRET || ''
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''

/**
 * LINEの署名検証を行う関数
 */
function verifySignature(body: string, signature: string, channelSecret: string): boolean {
    if (!signature || !channelSecret) return false
    const hash = crypto
        .createHmac('SHA256', channelSecret)
        .update(body)
        .digest('base64')
    return hash === signature
}

/**
 * LINEユーザーの表示名を取得する関数
 */
async function getLineUserProfile(userId: string, accessToken: string): Promise<string | null> {
    if (!userId || !accessToken) return null
    try {
        const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })
        if (response.ok) {
            const data = await response.json()
            return data.displayName || null
        }
    } catch (e) {
        console.error('[LINE Webhook] Failed to fetch profile:', e)
    }
    return null
}

/**
 * 日程調整メッセージの検知ロジック
 */
function detectScheduleKeywords(text: string): boolean {
    if (!text) return false

    // 日程調整に関連する一般的なキーワード
    const keywords = /(日程|調整|空き|予約|レッスン|振替|都合|曜日|時間|候補|希望|日時)/i
    
    // 日付・時間などを表す一般的なパターン
    const datePatterns = [
        /\d{1,2}月\d{1,2}日/, // 8月10日
        /\d{1,2}\/\d{1,2}/,   // 8/10
        /\d{1,2}日/,          // 10日
        /\d{1,2}時/           // 13時、13:00など
    ]

    const hasKeyword = keywords.test(text)
    const hasDatePattern = datePatterns.some(pattern => pattern.test(text))

    return hasKeyword || hasDatePattern
}

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text()
        const signature = req.headers.get('x-line-signature') || ''

        // 1. 署名検証 (開発環境でシークレットがない場合は警告のみにして通す)
        if (CHANNEL_SECRET) {
            const isValid = verifySignature(rawBody, signature, CHANNEL_SECRET)
            if (!isValid) {
                console.error('[LINE Webhook] Signature verification failed')
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
            }
        } else {
            console.warn('[LINE Webhook] LINE_CHANNEL_SECRET is not configured. Signature verification skipped.')
        }

        const body = JSON.parse(rawBody)
        const events = body.events || []
        const destination = body.destination || '' // LINE BotのボットID

        if (events.length === 0) {
            return NextResponse.json({ message: 'No events' })
        }

        // 管理者特権Supabaseクライアント作成
        const supabase = createAdminClient()

        // 2. ボットID (destination) に紐づくコーチを特定
        let coachId: string | null = null
        let botName = 'LINEボット'
        if (destination) {
            const { data: botConfig } = await supabase
                .from('line_bot_configs')
                .select('coach_id, bot_name')
                .eq('bot_id', destination)
                .single()
            
            if (botConfig) {
                coachId = botConfig.coach_id
                botName = botConfig.bot_name
            }
        }

        // コーチが特定できない場合は、デフォルトの管理者に紐付けるか、もしくは処理を中断
        if (!coachId) {
            console.warn(`[LINE Webhook] No coach configured for bot_id (destination): ${destination}`)
            // ログの記録や通知のために、最初の管理者のIDをフォールバックに設定する
            const { data: adminProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'admin')
                .limit(1)
                .single()
            
            if (adminProfile) {
                coachId = adminProfile.id
            } else {
                return NextResponse.json({ message: 'No coach or admin found for this bot' })
            }
        }

        for (const event of events) {
            // テキストメッセージイベントのみを対象にする
            if (event.type === 'message' && event.message && event.message.type === 'text') {
                const messageText = event.message.text
                const lineUserId = event.source.userId
                const direction = event.source.type === 'user' ? 'customer_to_coach' : 'coach_to_customer'

                // 3. 日程調整に関するメッセージか判定
                if (detectScheduleKeywords(messageText)) {
                    console.log(`[LINE Webhook] Schedule keyword detected: "${messageText}"`)

                    // 4. 送信ユーザーのプロフィール情報を取得
                    const displayName = await getLineUserProfile(lineUserId, CHANNEL_ACCESS_TOKEN) || 'LINEユーザー'

                     // 5. 自動マージ（重複フィルタリング）処理
                     // 同じ顧客 (line_user_id) ＆ 同じコーチ (coachId) で、直近24時間以内の未確認 (unread) ログを検索
                     const oneDayAgo = new Date()
                     oneDayAgo.setDate(oneDayAgo.getDate() - 1)

                     const { data: existingUnreadLog, error: searchError } = await supabase
                         .from('line_monitoring_logs')
                         .select('id, message_text')
                         .eq('line_user_id', lineUserId)
                         .eq('coach_id', coachId)
                         .eq('status', 'unread')
                         .gte('detected_at', oneDayAgo.toISOString())
                         .maybeSingle()

                     let isMerged = false

                     if (searchError) {
                         console.error('[LINE Webhook] Failed to search existing unread log:', searchError)
                     }

                     if (existingUnreadLog) {
                         // 既存の未読ログがある場合、改行でメッセージを追記して更新
                         const separator = direction === 'customer_to_coach' ? '\n(顧客): ' : '\n(コーチ): '
                         const updatedMessage = `${existingUnreadLog.message_text}${separator}${messageText}`
                         
                         const { error: updateError } = await supabase
                             .from('line_monitoring_logs')
                             .update({
                                 message_text: updatedMessage,
                                 detected_at: new Date().toISOString() // 最終検知日時を更新
                             })
                             .eq('id', existingUnreadLog.id)

                         if (updateError) {
                             console.error('[LINE Webhook] Failed to update/merge log:', updateError)
                         } else {
                             isMerged = true
                             console.log(`[LINE Webhook] Successfully merged message into existing log ID: ${existingUnreadLog.id}`)
                         }
                     }

                     // 既存ログがなければ新規挿入
                     if (!isMerged) {
                         const prefix = direction === 'customer_to_coach' ? '(顧客): ' : '(コーチ): '
                         const { error: insertError } = await supabase
                             .from('line_monitoring_logs')
                             .insert({
                                 coach_id: coachId,
                                 line_user_id: lineUserId,
                                 line_display_name: displayName,
                                 message_text: `${prefix}${messageText}`,
                                 direction: direction,
                                 status: 'unread',
                                 detected_at: new Date().toISOString()
                             })

                         if (insertError) {
                             console.error('[LINE Webhook] Failed to insert log to DB:', insertError)
                         }
                     }

                    // 6. 古いログの自動削除 (3ヶ月以上前) の自己クリーンアップ
                    const threeMonthsAgo = new Date()
                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
                    
                    const { error: deleteError } = await supabase
                        .from('line_monitoring_logs')
                        .delete()
                        .lt('detected_at', threeMonthsAgo.toISOString())

                    if (deleteError) {
                        console.error('[LINE Webhook] Failed to auto-cleanup old logs:', deleteError)
                    }

                    // 7. Google Chatへ通知する
                    // 有効な Google Chat Webhook URL を取得
                    const { data: webhooks } = await supabase
                        .from('google_chat_webhooks')
                        .select('webhook_url')
                        .eq('active', true)
                    
                    if (webhooks && webhooks.length > 0 && !isMerged) {
                        // コーチの氏名を取得
                        const { data: coachProfile } = await supabase
                            .from('profiles')
                            .select('full_name')
                            .eq('id', coachId)
                            .single()

                        const coachName = coachProfile?.full_name || '不明なコーチ'
                        const chatMessage = `💬 *【LINE日程調整検知】*\n` +
                                            `・*対象アカウント*: ${botName}\n` +
                                            `・*担当コーチ*: ${coachName}\n` +
                                            `・*顧客名*: ${displayName} 様\n` +
                                            `・*メッセージ*: 「${messageText}」\n` +
                                            `・*検知日時*: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`

                        for (const webhook of webhooks) {
                            try {
                                await sendGoogleChatMessage(webhook.webhook_url, chatMessage)
                            } catch (notifyErr) {
                                console.error('[LINE Webhook] Failed to send Google Chat message:', notifyErr)
                            }
                        }
                    }
                }
            }
        }

        return NextResponse.json({ message: 'Success' })
    } catch (e: any) {
        console.error('[LINE Webhook] Internal server error:', e)
        return NextResponse.json({ error: 'Internal server error', details: e.message }, { status: 500 })
    }
}
