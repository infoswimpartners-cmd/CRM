import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendGoogleChatMessage } from '@/lib/google-chat'
import { 
    isOfficialBotDestination, 
    handleOfficialLineFollow, 
    handleOfficialLineUnfollow, 
    handleOfficialLineMessage 
} from '@/lib/line-step-reminders'

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

        // 2. ボットID (destination) または 各コーチのトークンから担当コーチを特定
        let coachId: string | null = null
        let botName = 'LINEボット'
        let gchatWebhookId: string | null = null
        let coachAccessToken: string | null = null

        if (destination) {
            // まずは bot_id が destination (U...) と完全一致するものを高速検索
            const { data: botConfig } = await supabase
                .from('line_bot_configs')
                .select('id, coach_id, bot_name, bot_id, gchat_webhook_id, channel_access_token')
                .eq('bot_id', destination)
                .maybeSingle()
            
            if (botConfig) {
                coachId = botConfig.coach_id
                botName = botConfig.bot_name
                gchatWebhookId = botConfig.gchat_webhook_id || null
                coachAccessToken = botConfig.channel_access_token || null
            } else {
                // destination で直接一致しない場合（ベーシックID @... で登録されている等）、
                // 登録されている全コーチのアクセストークンを用いてボット情報を照合
                const { data: allConfigs } = await supabase
                    .from('line_bot_configs')
                    .select('id, coach_id, bot_name, bot_id, gchat_webhook_id, channel_access_token')

                if (allConfigs && allConfigs.length > 0) {
                    let matchedConfig: any = null

                    for (const config of allConfigs) {
                        if (!config.channel_access_token) continue

                        try {
                            const botInfoRes = await fetch('https://api.line.me/v2/bot/info', {
                                headers: { 'Authorization': `Bearer ${config.channel_access_token}` }
                            })
                            if (botInfoRes.ok) {
                                const botInfo = await botInfoRes.json()
                                // ボット固有ID (userId: U...) または ベーシックID で照合
                                if (botInfo.userId === destination || 
                                    (botInfo.basicId && (botInfo.basicId === destination || `@${botInfo.basicId}` === destination))) {
                                    matchedConfig = config
                                    coachAccessToken = config.channel_access_token
                                    break
                                }
                            }
                        } catch (e) {
                            console.error(`[LINE Webhook] Failed to fetch bot info for "${config.bot_name}":`, e)
                        }
                    }

                    if (matchedConfig) {
                        coachId = matchedConfig.coach_id
                        botName = matchedConfig.bot_name
                        gchatWebhookId = matchedConfig.gchat_webhook_id || null

                        // 次回以降のアクセス高速化のため、bot_id を destination (U...) で自動更新（学習）
                        await supabase
                            .from('line_bot_configs')
                            .update({ bot_id: destination })
                            .eq('id', matchedConfig.id)
                        
                        console.log(`[LINE Webhook] Successfully matched and updated bot_id for "${matchedConfig.bot_name}" to destination: ${destination}`)
                    }
                }
            }
        }

        // コーチが特定できない場合は警告を出力
        if (!coachId) {
            console.warn(`[LINE Webhook] No coach configured for bot_id (destination): ${destination}`)
            botName = '未紐付けボット'
        }

        const isOfficialBot = isOfficialBotDestination(destination)

        for (const event of events) {
            const lineUserId = event.source?.userId

            // A. 友だち追加イベント (follow)
            if (event.type === 'follow' && lineUserId) {
                console.log(`[LINE Webhook] Follow event received from user: ${lineUserId}, destination: ${destination}`)
                if (isOfficialBot) {
                    const activeAccessToken = coachAccessToken || CHANNEL_ACCESS_TOKEN
                    const displayName = await getLineUserProfile(lineUserId, activeAccessToken)
                    await handleOfficialLineFollow(lineUserId, displayName)
                }
                continue
            }

            // B. ブロック（友だち解除）イベント (unfollow)
            if (event.type === 'unfollow' && lineUserId) {
                console.log(`[LINE Webhook] Unfollow event received from user: ${lineUserId}`)
                if (isOfficialBot) {
                    await handleOfficialLineUnfollow(lineUserId)
                }
                continue
            }

            // C. テキストメッセージイベント
            if (event.type === 'message' && event.message && event.message.type === 'text') {
                const messageText = event.message.text
                const direction = event.source.type === 'user' ? 'customer_to_coach' : 'coach_to_customer'

                // 事務局公式LINE宛てのメッセージの場合、ステップ配信を即時停止＆管理者通知
                if (isOfficialBot && lineUserId && direction === 'customer_to_coach') {
                    const activeAccessToken = coachAccessToken || CHANNEL_ACCESS_TOKEN
                    const displayName = await getLineUserProfile(lineUserId, activeAccessToken)
                    await handleOfficialLineMessage(lineUserId, messageText, displayName)
                }

                // 3. 日程調整に関するメッセージか判定
                if (detectScheduleKeywords(messageText)) {
                    console.log(`[LINE Webhook] Schedule keyword detected: "${messageText}"`)

                    // 4. 送信ユーザーのプロフィール情報を取得（担当コーチのトークンを優先使用）
                    const activeAccessToken = coachAccessToken || CHANNEL_ACCESS_TOKEN
                    const displayName = await getLineUserProfile(lineUserId, activeAccessToken) || 'LINEユーザー'

                     // 5. 自動マージ（重複フィルタリング）処理
                     // coachIdが特定できている場合のみDBログに保存
                     let isMerged = false

                     if (coachId) {
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
                     } else {
                         console.warn(`[LINE Webhook] Skip log insertion: coachId is null for destination ${destination}`)
                     }

                    // 6. 古いログの自動削除 (3ヶ月以上前) の自己クリーンアップ
                    const threeMonthsAgo = new Date()
                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
                    
                    const { error: deleteError } = await supabase
                        .from('line_monitoring_logs')
                        .delete()
                        .lt('detected_at', threeMonthsAgo.toISOString())

                     // 7. 管理者専用の Google Chat スペースへ通知する（新規発生時のみ）
                     if (!isMerged) {
                         let targetWebhookUrl: string | null = null
                         let isEnabled = true

                         // 管理者設定された「LINE日程調整検知 専用Webhook」を取得
                         const { data: adminTrigger } = await supabase
                             .from('email_triggers')
                             .select('google_chat_webhook_url, google_chat_enabled')
                             .eq('id', 'line_schedule_detected')
                             .maybeSingle()

                         if (adminTrigger) {
                             targetWebhookUrl = adminTrigger.google_chat_webhook_url
                             isEnabled = adminTrigger.google_chat_enabled !== false
                         }

                         // 専用Webhook未設定の場合、既存の「日程調整」関連Webhookをフォールバック検索
                         if (!targetWebhookUrl) {
                             const { data: defaultWebhook } = await supabase
                                 .from('google_chat_webhooks')
                                 .select('webhook_url')
                                 .ilike('space_name', '%日程調整%')
                                 .eq('active', true)
                                 .limit(1)
                                 .maybeSingle()

                             if (defaultWebhook) {
                                 targetWebhookUrl = defaultWebhook.webhook_url
                             }
                         }

                         if (targetWebhookUrl && isEnabled) {
                             // コーチの氏名を取得
                             const { data: coachProfile } = await supabase
                                 .from('profiles')
                                 .select('full_name')
                                 .eq('id', coachId)
                                 .single()

                             const coachName = coachProfile?.full_name || '不明なコーチ'
                             const chatMessage = `【LINE日程調整検知】\n` +
                                                 `・対象アカウント: ${botName}\n` +
                                                 `・担当コーチ: ${coachName}\n` +
                                                 `・顧客名: ${displayName} 様\n` +
                                                 `・メッセージ: 「${messageText}」\n` +
                                                 `・検知日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`

                             try {
                                 await sendGoogleChatMessage(targetWebhookUrl, chatMessage)
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
