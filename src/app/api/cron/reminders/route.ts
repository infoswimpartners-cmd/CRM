import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { emailService } from '@/lib/email'
import { lineService } from '@/lib/line'
import { addDays, startOfDay, endOfDay, format } from 'date-fns'
import { ja } from 'date-fns/locale'

// キャッシュを無効化
export const dynamic = 'force-dynamic'

/**
 * Google Chat に Webhook 経由でメッセージを送信するヘルパー
 */
async function sendGoogleChatMessage(webhookUrl: string, messageText: string) {
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: messageText })
        })
        return response.ok
    } catch (e) {
        console.error('[Cron Reminders] Failed to send Google Chat message:', e)
        return false
    }
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const dryRun = searchParams.get('dry_run') === 'true'
    const targetDateParam = searchParams.get('date') // YYYY-MM-DD 指定テスト用

    // 【安全ガード / キルスイッチ】
    // 管理者からの明示的な許可（ENABLE_LESSON_REMINDERS_CRON === 'true'）が出るまで自動送信を完全ブロック
    const isCronEnabled = process.env.ENABLE_LESSON_REMINDERS_CRON === 'true'
    if (!isCronEnabled && !dryRun) {
        return NextResponse.json({
            success: true,
            paused: true,
            message: '前日リマインドの自動配信は現在、安全のため一時停止（無効化）されています。許可が出るまで他のお客様への自動送信は行われません。',
            processed: 0
        })
    }

    const supabase = await createClient()

    // 1. 日本時間 (JST) で「明日」の開始・終了日時を計算
    const now = new Date()
    let targetTomorrow = addDays(now, 1)

    if (targetDateParam) {
        targetTomorrow = new Date(targetDateParam)
    }

    // JSTの開始（00:00:00）と終了（23:59:59）
    const startOfTomorrow = startOfDay(targetTomorrow).toISOString()
    const endOfTomorrow = endOfDay(targetTomorrow).toISOString()

    try {
        // 2. 翌日の予約枠（生徒が割り当てられているスケジュール）を取得
        let query = supabase
            .from('lesson_schedules')
            .select(`
                id,
                coach_id,
                student_id,
                start_time,
                end_time,
                title,
                location,
                notes,
                reminder_sent_at,
                students (
                    id,
                    full_name,
                    contact_email,
                    line_user_id
                ),
                profiles:coach_id (
                    id,
                    full_name
                ),
                lesson_masters:lesson_master_id (
                    id,
                    name
                )
            `)
            .gte('start_time', startOfTomorrow)
            .lte('start_time', endOfTomorrow)
            .not('student_id', 'is', null)

        // dry-run でない場合は、すでにリマインド送信済みの枠を除外
        if (!dryRun) {
            query = query.is('reminder_sent_at', null)
        }

        const { data: schedules, error: schedError } = await query

        if (schedError) {
            console.error('[Cron Reminders] Supabase Error:', schedError)
            return NextResponse.json({ error: schedError.message }, { status: 500 })
        }

        if (!schedules || schedules.length === 0) {
            return NextResponse.json({ 
                success: true, 
                message: 'No unreminded schedules found for tomorrow', 
                target_date: startOfTomorrow,
                processed: 0 
            })
        }

        // 3. 全コーチの LINEボット設定＆Google Chat設定 を取得
        const { data: botConfigs } = await supabase
            .from('line_bot_configs')
            .select('coach_id, bot_name, channel_access_token, gchat_webhook_id')

        const botConfigMap = new Map((botConfigs || []).map(b => [b.coach_id, b]))

        // 4. 有効な Google Chat Webhook 一覧を取得
        const { data: webhooks } = await supabase
            .from('google_chat_webhooks')
            .select('id, webhook_url, space_name')
            .eq('active', true)

        const webhookMap = new Map((webhooks || []).map(w => [w.id, w.webhook_url]))

        // 5. メールテンプレートの取得
        const { data: templateData } = await supabase
            .from('email_templates')
            .select('*')
            .eq('key', 'lesson_reminder')
            .maybeSingle()

        const templateBody = templateData?.body || '{{name}}様\n\n明日 {{date}} {{time}}よりレッスンがあります。\n担当コーチ: {{coach_name}}\n場所: {{location}}\n\nお気をつけてお越しくださいませ。'
        const templateSubject = templateData?.subject || '【Swim Partners】明日のレッスン予定のご案内'

        const results = []

        // 6. 各レッスンについて配信処理
        for (const schedule of schedules) {
            const student = schedule.students as any
            const coach = schedule.profiles as any
            const lessonMaster = schedule.lesson_masters as any
            const coachConfig = schedule.coach_id ? botConfigMap.get(schedule.coach_id) : null

            if (!student) continue

            const startTime = new Date(schedule.start_time)
            const endTime = new Date(schedule.end_time)
            const dateStr = format(startTime, 'M月d日(E)', { locale: ja })
            const timeStr = `${format(startTime, 'HH:mm')}〜${format(endTime, 'HH:mm')}`
            const coachName = coach?.full_name || '担当コーチ'
            const locationStr = schedule.location || 'ご指定のプール'

            // --- A. 生徒向けメッセージ作成 ---
            const studentLineMessage = 
                `🏊‍♂️ *【Swim Partners】明日のレッスン予定のご案内*\n\n` +
                `${student.full_name} 様\n\n` +
                `いつもご利用ありがとうございます。\n` +
                `明日、以下の内容でレッスンを予定しております。\n\n` +
                `・*日時*: ${dateStr} ${timeStr}\n` +
                `・*担当コーチ*: ${coachName}\n` +
                `・*場所*: ${locationStr}\n` +
                (schedule.notes ? `・*連絡事項*: ${schedule.notes}\n` : '') +
                `\n体調にお気をつけてお越しくださいませ。`

            let lineSent = false
            let emailSent = false
            let gchatSent = false

            // --- B. 生徒宛て LINE 送信（担当コーチの公式アカウントから） ---
            if (student.line_user_id && coachConfig?.channel_access_token) {
                if (dryRun) {
                    console.log(`[DRY RUN] Would send LINE via ${coachConfig.bot_name} to student ${student.full_name}`)
                    lineSent = true
                } else {
                    lineSent = await lineService.pushMessage(
                        student.line_user_id,
                        studentLineMessage,
                        coachConfig.channel_access_token
                    )
                }
            }

            // --- C. 生徒宛て メール送信（LINEが未連携または送信失敗時のみフォールバック送信） ---
            if (!lineSent && student.contact_email) {
                let emailBody = templateBody
                    .replace(/{{name}}/g, student.full_name)
                    .replace(/{{student_name}}/g, student.full_name)
                    .replace(/{{date}}/g, dateStr)
                    .replace(/{{time}}/g, timeStr)
                    .replace(/{{coach_name}}/g, coachName)
                    .replace(/{{location}}/g, locationStr)
                    .replace(/{{notes}}/g, schedule.notes || '')

                if (dryRun) {
                    console.log(`[DRY RUN] LINE not sent, would fallback to Email for ${student.contact_email}`)
                    emailSent = true
                } else {
                    emailSent = await emailService.sendEmail({
                        to: student.contact_email,
                        bcc: process.env.SMTP_FROM || process.env.SMTP_USER,
                        subject: templateSubject,
                        text: emailBody
                    })
                }
            }

            // --- D. コーチ宛て Google Chat 通知（担当コーチ専用スペースへ） ---
            const targetWebhookId = coachConfig?.gchat_webhook_id
            const webhookUrl = targetWebhookId ? webhookMap.get(targetWebhookId) : null

            if (webhookUrl) {
                const coachChatMessage = 
                    `⏰ *【明日のレッスン予定（前日リマインド）】*\n` +
                    `・*担当コーチ*: ${coachName}\n` +
                    `・*生徒名*: ${student.full_name} 様\n` +
                    `・*日時*: ${dateStr} ${timeStr}\n` +
                    `・*場所*: ${locationStr}\n` +
                    (lessonMaster?.name ? `・*種別*: ${lessonMaster.name}\n` : '') +
                    (schedule.notes ? `・*特記事項*: 「${schedule.notes}」\n` : '') +
                    `・*ステータス*: 予約確定`

                if (dryRun) {
                    console.log(`[DRY RUN] Would send GChat to space for coach ${coachName}`)
                    gchatSent = true
                } else {
                    gchatSent = await sendGoogleChatMessage(webhookUrl, coachChatMessage)
                }
            }

            // --- E. 送信記録の更新（二重送信防止） ---
            if (!dryRun && (lineSent || emailSent || gchatSent)) {
                await supabase
                    .from('lesson_schedules')
                    .update({ reminder_sent_at: new Date().toISOString() })
                    .eq('id', schedule.id)
            }

            results.push({
                schedule_id: schedule.id,
                student_name: student.full_name,
                coach_name: coachName,
                time: `${dateStr} ${timeStr}`,
                line_sent: lineSent,
                email_sent: emailSent,
                gchat_sent: gchatSent
            })
        }

        return NextResponse.json({
            success: true,
            dry_run: dryRun,
            target_date: startOfTomorrow,
            processed: results.length,
            details: results
        })

    } catch (e: any) {
        console.error('[Cron Reminders] Unexpected Error:', e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
