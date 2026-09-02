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

    // 1. 日本時間 (JST) で「明日」の開始・終了日時（00:00:00 〜 23:59:59）を正確に計算
    let targetYear: number
    let targetMonth: number
    let targetDay: number

    if (targetDateParam && /^\d{4}-\d{2}-\d{2}$/.test(targetDateParam)) {
        const [y, m, d] = targetDateParam.split('-').map(Number)
        targetYear = y
        targetMonth = m
        targetDay = d
    } else {
        // 現在のJST日時から翌日を算出
        const jstNowStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })
        const jstNow = new Date(jstNowStr)
        const jstTomorrow = new Date(jstNow)
        jstTomorrow.setDate(jstTomorrow.getDate() + 1)
        targetYear = jstTomorrow.getFullYear()
        targetMonth = jstTomorrow.getMonth() + 1
        targetDay = jstTomorrow.getDate()
    }

    const pad = (n: number) => String(n).padStart(2, '0')
    const startOfTomorrow = new Date(`${targetYear}-${pad(targetMonth)}-${pad(targetDay)}T00:00:00+09:00`).toISOString()
    const endOfTomorrow = new Date(`${targetYear}-${pad(targetMonth)}-${pad(targetDay)}T23:59:59.999+09:00`).toISOString()

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
                    student_number,
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

        const { data: rawSchedules, error: schedError } = await query

        if (schedError) {
            console.error('[Cron Reminders] Supabase Error:', schedError)
            return NextResponse.json({ error: schedError.message }, { status: 500 })
        }

        // 【安全ガード】
        // 自動送信許可（ENABLE_LESSON_REMINDERS_CRON === 'true'）が出ていない場合は、
        // テスト太郎（会員番号 0035）以外の他顧客をすべて安全に除外
        const schedules = (rawSchedules || []).filter(sched => {
            const student = sched.students as any
            if (isCronEnabled) return true
            return student?.student_number === '0035' || student?.full_name?.includes('テスト太郎')
        })

        if (!schedules || schedules.length === 0) {
            return NextResponse.json({ 
                success: true, 
                message: 'No unreminded schedules found for tomorrow', 
                target_date: `${targetYear}-${pad(targetMonth)}-${pad(targetDay)}`,
                date_range: { start: startOfTomorrow, end: endOfTomorrow },
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

        // 5. 各メッセージテンプレートの取得（3パターン）
        const { data: reminderTemplates } = await supabase
            .from('email_templates')
            .select('*')
            .in('key', ['lesson_reminder_line', 'lesson_reminder_email', 'lesson_reminder_coach', 'lesson_reminder'])

        const templateMap = new Map((reminderTemplates || []).map(t => [t.key, t]))

        // ① 生徒LINE用
        const lineTmpl = templateMap.get('lesson_reminder_line') || templateMap.get('lesson_reminder')
        const lineBodyTmpl = lineTmpl?.body || '【Swim Partners】明日のレッスン予定のご案内\n\n{{name}} 様\n\nいつもご利用ありがとうございます。\n明日、以下の内容でレッスンを予定しております。\n\n・日時: {{date}} {{time}}\n・担当コーチ: {{coach_name}}\n・場所: {{location}}\n{{notes}}\n\n体調にお気をつけてお越しくださいませ。'

        // ② 生徒メール用（LINE未送信時）
        const emailTmpl = templateMap.get('lesson_reminder_email') || templateMap.get('lesson_reminder')
        const emailBodyTmpl = emailTmpl?.body || '{{name}} 様\n\nいつもSwim Partnersをご利用いただきありがとうございます。\n\n明日 {{date}} {{time}}より、{{coach_name}}とのレッスン予約がございます。\n場所: {{location}}\n{{notes}}\n\n当日はお気をつけてお越しください。\nお待ちしております。\n\nSwim Partners'
        const emailSubjectTmpl = emailTmpl?.subject || '【Swim Partners】明日のレッスン予約のリマインド'

        // ③ コーチGoogle Chat用
        const coachTmpl = templateMap.get('lesson_reminder_coach')
        const coachBodyTmpl = coachTmpl?.body || '【明日のレッスン予定（前日リマインド）】\n・担当コーチ: {{coach_name}}\n・生徒名: {{name}} 様\n・日時: {{date}} {{time}}\n・場所: {{location}}\n{{notes}}\n{{previous_lesson}}\n・ステータス: 予約確定'

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
            const notesStr = schedule.notes ? `・連絡事項: 「${schedule.notes}」` : ''

            let lineSent = false
            let emailSent = false
            let gchatSent = false

            // --- A. 生徒宛て LINE 送信（生徒送信用 LINE テンプレートを適用） ---
            if (student.line_user_id && coachConfig?.channel_access_token) {
                const studentLineMessage = lineBodyTmpl
                    .replace(/{{name}}/g, student.full_name)
                    .replace(/{{student_name}}/g, student.full_name)
                    .replace(/{{lesson_date}}/g, `${dateStr} ${timeStr}`)
                    .replace(/{{date}}/g, dateStr)
                    .replace(/{{time}}/g, timeStr)
                    .replace(/{{coach_name}}/g, coachName)
                    .replace(/{{location}}/g, locationStr)
                    .replace(/{{notes}}/g, notesStr)

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

            // --- B. 生徒宛て メール送信（LINEが未連携または送信失敗時のみフォールバック送信） ---
            if (!lineSent && student.contact_email) {
                const studentEmailMessage = emailBodyTmpl
                    .replace(/{{name}}/g, student.full_name)
                    .replace(/{{student_name}}/g, student.full_name)
                    .replace(/{{lesson_date}}/g, `${dateStr} ${timeStr}`)
                    .replace(/{{date}}/g, dateStr)
                    .replace(/{{time}}/g, timeStr)
                    .replace(/{{coach_name}}/g, coachName)
                    .replace(/{{location}}/g, locationStr)
                    .replace(/{{notes}}/g, notesStr)

                const studentEmailSubject = emailSubjectTmpl
                    .replace(/{{name}}/g, student.full_name)
                    .replace(/{{date}}/g, dateStr)

                if (dryRun) {
                    console.log(`[DRY RUN] LINE not sent, would fallback to Email for ${student.contact_email}`)
                    emailSent = true
                } else {
                    emailSent = await emailService.sendEmail({
                        to: student.contact_email,
                        bcc: process.env.SMTP_FROM || process.env.SMTP_USER,
                        subject: studentEmailSubject,
                        text: studentEmailMessage
                    })
                }
            }

            // --- C. コーチ宛て Google Chat 通知（コーチ送信用テンプレートを適用） ---
            const targetWebhookId = coachConfig?.gchat_webhook_id
            const webhookUrl = targetWebhookId ? webhookMap.get(targetWebhookId) : null

            if (webhookUrl) {
                // 生徒の前回レッスン報告（練習内容・課題など）を取得
                let prevLessonInfo = ''
                try {
                    const { data: prevLesson } = await supabase
                        .from('lessons')
                        .select('lesson_date, menu_description, feedback_good, feedback_next, coach_comment')
                        .eq('student_id', student.id)
                        .not('menu_description', 'is', null)
                        .order('lesson_date', { ascending: false })
                        .limit(1)
                        .maybeSingle()

                    if (prevLesson && prevLesson.menu_description) {
                        const prevDateStr = format(new Date(prevLesson.lesson_date), 'M/d(E)', { locale: ja })
                        prevLessonInfo = 
                            `\n━━━━━━━━━━━━━━\n` +
                            `【前回の練習内容 (${prevDateStr})】\n` +
                            `・${prevLesson.menu_description}\n` +
                            (prevLesson.feedback_next ? `・次回への課題: ${prevLesson.feedback_next}\n` : '') +
                            (prevLesson.feedback_good ? `・良かった点: ${prevLesson.feedback_good}\n` : '') +
                            (prevLesson.coach_comment ? `・指導メモ: ${prevLesson.coach_comment}\n` : '') +
                            `━━━━━━━━━━━━━━`
                    }
                } catch (prevErr) {
                    console.error('[Cron Reminders] Failed to fetch previous lesson report:', prevErr)
                }

                const coachChatMessage = coachBodyTmpl
                    .replace(/{{name}}/g, student.full_name)
                    .replace(/{{student_name}}/g, student.full_name)
                    .replace(/{{lesson_date}}/g, `${dateStr} ${timeStr}`)
                    .replace(/{{date}}/g, dateStr)
                    .replace(/{{time}}/g, timeStr)
                    .replace(/{{coach_name}}/g, coachName)
                    .replace(/{{location}}/g, locationStr)
                    .replace(/{{notes}}/g, notesStr)
                    .replace(/{{previous_lesson}}/g, prevLessonInfo)

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
