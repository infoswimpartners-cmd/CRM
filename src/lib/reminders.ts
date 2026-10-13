import { createAdminClient } from '@/lib/supabase/admin'
import { emailService } from '@/lib/email'
import { lineService } from '@/lib/line'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

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

export interface ReminderProcessOptions {
    dryRun?: boolean
    targetDate?: string // YYYY-MM-DD
}

/**
 * コーチ用レッスン報告フォームのURLを生成（scheduleId 付きで開くとフォームが自動入力される）
 */
export function buildCoachReportUrl(scheduleId: string): string {
    const appUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://manager.swim-partners.com').replace(/\/$/, '')
    return `${appUrl}/coach/report?scheduleId=${scheduleId}`
}

export interface ReminderProcessResult {
    success: boolean
    message?: string
    error?: string
    target_date?: string
    date_range?: { start: string; end: string }
    processed?: number
    details?: any[]
    paused?: boolean
}

/**
 * 前日レッスンリマインドの一括送信処理を実行します
 */
export async function processLessonReminders(options: ReminderProcessOptions = {}): Promise<ReminderProcessResult> {
    const { dryRun = false, targetDate } = options

    const isCronEnabled = process.env.ENABLE_LESSON_REMINDERS_CRON === 'true'

    const supabase = createAdminClient()

    // 1. 日本時間 (JST) で「明日」の開始・終了日時（00:00:00 〜 23:59:59）を正確に計算
    let targetYear: number
    let targetMonth: number
    let targetDay: number

    if (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
        const [y, m, d] = targetDate.split('-').map(Number)
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
                attendance_type,
                reminder_sent_at,
                students (
                    id,
                    full_name,
                    second_student_name,
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
            return { success: false, error: schedError.message }
        }

        // 3. 全コーチの LINEボット設定＆Google Chat設定 を取得
        const { data: botConfigs } = await supabase
            .from('line_bot_configs')
            .select('coach_id, bot_name, channel_access_token, gchat_webhook_id')

        const botConfigMap = new Map((botConfigs || []).map(b => [b.coach_id, b]))

        // 【対象スケジュールの抽出】
        // ① テスト太郎（会員番号 0035）
        // ② または、担当コーチの LINE設定（channel_access_token）が完了しているスケジュール
        // ※ これにより、設定完了済みのコーチから順次自動で送信対象となり、未設定のコーチは除外されます。
        // ※ 環境変数 ENABLE_LESSON_REMINDERS_CRON === 'true' の場合も全体許可として機能します。
        const schedules = (rawSchedules || []).filter(sched => {
            const student = sched.students as any
            const isTestStudent = student?.student_number === '0035' || student?.full_name?.includes('テスト太郎')
            if (isTestStudent || isCronEnabled) return true

            // 担当コーチのLINE設定（アクセストークン）が存在し、空でないか判定
            if (!sched.coach_id) return false
            const coachConfig = botConfigMap.get(sched.coach_id)
            const isCoachConfigured = !!(coachConfig?.channel_access_token && coachConfig.channel_access_token.trim().length > 0)
            return isCoachConfigured
        })

        if (!schedules || schedules.length === 0) {
            return {
                success: true,
                message: 'No unreminded schedules found for tomorrow',
                target_date: `${targetYear}-${pad(targetMonth)}-${pad(targetDay)}`,
                date_range: { start: startOfTomorrow, end: endOfTomorrow },
                processed: 0
            }
        }

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
        const coachBodyTmpl = coachTmpl?.body || '【明日のレッスン予定（前日リマインド）】\n・担当コーチ: {{coach_name}}\n・生徒名: {{name}} 様\n・日時: {{date}} {{time}}\n・場所: {{location}}\n{{previous_lesson}}\n・ステータス: 予約確定'

        const results = []

        /**
         * 日本時間 (JST) での日時・時刻フォーマッター (24時間表示)
         */
        function formatJST(isoString: string) {
            const d = new Date(isoString)
            const jstStr = d.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })
            const jstDate = new Date(jstStr)

            const month = jstDate.getMonth() + 1
            const day = jstDate.getDate()
            const weekday = ['日', '月', '火', '水', '木', '金', '土'][jstDate.getDay()]
            const hours = String(jstDate.getHours()).padStart(2, '0')
            const minutes = String(jstDate.getMinutes()).padStart(2, '0')

            return {
                dateStr: `${month}月${day}日(${weekday})`,
                prevDateStr: `${month}/${day}(${weekday})`,
                timeStr24: `${hours}:${minutes}`
            }
        }

        // 6. 各レッスンについて配信処理
        for (const schedule of schedules) {
            const student = schedule.students as any
            const coach = schedule.profiles as any
            const coachConfig = schedule.coach_id ? botConfigMap.get(schedule.coach_id) : null

            if (!student) continue

            const startJST = formatJST(schedule.start_time)
            const endJST = formatJST(schedule.end_time)
            const dateStr = startJST.dateStr
            const timeStr = `${startJST.timeStr24}〜${endJST.timeStr24}`
            const coachName = coach?.full_name || '担当コーチ'
            const locationStr = schedule.location || 'ご指定のプール'
            // 2名生徒の場合の表示名組み立て（コーチ通知用）
            const secondStudentName = student.second_student_name?.trim()
            let coachStudentDisplayNameWithHonorific = `${student.full_name} 様`
            let coachStudentDisplayNamePlain = student.full_name

            if (secondStudentName) {
                if (schedule.attendance_type === 'student2') {
                    coachStudentDisplayNameWithHonorific = `${secondStudentName} 様`
                    coachStudentDisplayNamePlain = secondStudentName
                } else if (schedule.attendance_type === 'student1') {
                    coachStudentDisplayNameWithHonorific = `${student.full_name} 様`
                    coachStudentDisplayNamePlain = student.full_name
                } else {
                    // 'both' または未指定（通常の2名レッスン）の場合
                    coachStudentDisplayNameWithHonorific = `${student.full_name} 様・${secondStudentName} 様`
                    coachStudentDisplayNamePlain = `${student.full_name}・${secondStudentName}`
                }
            }

            // スケジュールメモ内の「案件ID」等のシステム管理情報を通知文面から除外
            const cleanNotes = schedule.notes
                ? schedule.notes
                    .split('\n')
                    .filter((line: string) => !line.match(/案件ID\s*[:：]/i))
                    .join('\n')
                    .trim()
                : ''
            const notesStr = cleanNotes ? `・連絡事項: 「${cleanNotes}」` : ''

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
            const coachWebhookUrl = targetWebhookId ? webhookMap.get(targetWebhookId) : null

            if (coachWebhookUrl) {
                // 前回レッスンの報告（前回の練習内容）を取得（lessonsテーブルより）
                let previousLessonNote = '※前回の練習記録なし'
                try {
                    const { data: prevLesson } = await supabase
                        .from('lessons')
                        .select('id, lesson_date, menu_description, coach_comment, feedback_next')
                        .eq('student_id', student.id)
                        .lt('lesson_date', schedule.start_time)
                        .order('lesson_date', { ascending: false })
                        .limit(1)
                        .maybeSingle()

                    if (prevLesson) {
                        const prevJST = formatJST(prevLesson.lesson_date)
                        const prevDateStr = prevJST.prevDateStr
                        const parts: string[] = []
                        if (prevLesson.menu_description && prevLesson.menu_description.trim()) {
                            parts.push(`メニュー: ${prevLesson.menu_description.trim()}`)
                        }
                        if (prevLesson.coach_comment && prevLesson.coach_comment.trim()) {
                            parts.push(`指導メモ: ${prevLesson.coach_comment.trim()}`)
                        }
                        if (prevLesson.feedback_next && prevLesson.feedback_next.trim()) {
                            parts.push(`次回課題: ${prevLesson.feedback_next.trim()}`)
                        }
                        const details = parts.filter(Boolean).join(' / ')
                        previousLessonNote = `・前回の練習 (${prevDateStr}): ${details || '（特記事項なし）'}`
                    }
                } catch (e) {
                    console.error('[Cron Reminders] Failed to fetch previous lesson report from lessons:', e)
                }

                // レッスン報告フォームのリンク（スケジュール指定で開くと生徒・日時・レッスン種別が自動入力される）
                const reportUrl = buildCoachReportUrl(schedule.id)

                let coachMessage = coachBodyTmpl
                    .replace(/{{name}}\s*様/g, coachStudentDisplayNameWithHonorific)
                    .replace(/{{student_name}}\s*様/g, coachStudentDisplayNameWithHonorific)
                    .replace(/{{name}}/g, coachStudentDisplayNamePlain)
                    .replace(/{{student_name}}/g, coachStudentDisplayNamePlain)
                    .replace(/{{lesson_date}}/g, `${dateStr} ${timeStr}`)
                    .replace(/{{date}}/g, dateStr)
                    .replace(/{{time}}/g, timeStr)
                    .replace(/{{coach_name}}/g, coachName)
                    .replace(/{{location}}/g, locationStr)
                    .replace(/{{notes}}/g, notesStr)
                    .replace(/{{previous_lesson}}/g, previousLessonNote)

                // テンプレートに {{report_url}} があれば置換、無ければ末尾に自動追記
                if (coachMessage.includes('{{report_url}}')) {
                    coachMessage = coachMessage.replace(/{{report_url}}/g, reportUrl)
                } else {
                    coachMessage = `${coachMessage.trimEnd()}\n\n▼レッスン報告フォーム（レッスン終了後にこちらからご報告ください）\n${reportUrl}`
                }

                if (dryRun) {
                    console.log(`[DRY RUN] Would send Coach Google Chat to ${coachWebhookUrl}`)
                    gchatSent = true
                } else {
                    gchatSent = await sendGoogleChatMessage(coachWebhookUrl, coachMessage)
                }
            }

            // --- D. 送信完了フラグの更新 ---
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
                line_sent: lineSent,
                email_sent: emailSent,
                gchat_sent: gchatSent
            })
        }

        return {
            success: true,
            target_date: `${targetYear}-${pad(targetMonth)}-${pad(targetDay)}`,
            processed: results.length,
            details: results
        }
    } catch (e: any) {
        console.error('[Cron Reminders] Unexpected error:', e)
        return { success: false, error: e.message }
    }
}

// コーチ宛て「レッスン報告のお願い」デフォルト文面（メッセージ設定 lesson_report_request_coach で上書き可能）
export const DEFAULT_REPORT_REQUEST_COACH_BODY = `お疲れ様です。
昨日のレッスンの報告がまだ確認できておりません。
お手数ですが、下記フォームよりレッスン報告をお願いいたします。

【報告対象のレッスン】
・生徒名：{{name}} 様
・日時：{{date}} {{time}}
・場所：{{location}}

▼レッスン報告フォーム（生徒・日時・レッスン種別は自動入力されます）
{{report_url}}

※すでにご報告済みの場合は行き違いですのでご容赦ください。
引き続きよろしくお願いいたします！`

/**
 * レッスン翌日に、未報告のレッスンについて担当コーチ専用 Google Chat へ報告依頼を送信します
 * - 対象: JST で「昨日」開始のスケジュールのうち、生徒が割り当てられ is_reported が未完了のもの
 * - 重複防止: app_configs に report_request_sent:<scheduleId> を保存
 */
export async function processLessonReportRequests(options: ReminderProcessOptions = {}): Promise<ReminderProcessResult> {
    const { dryRun = false, targetDate } = options
    const supabase = createAdminClient()

    // 1. 対象日（JSTで昨日）の算出
    let y: number, m: number, d: number
    if (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
        ;[y, m, d] = targetDate.split('-').map(Number)
    } else {
        const jstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
        jstNow.setDate(jstNow.getDate() - 1)
        y = jstNow.getFullYear()
        m = jstNow.getMonth() + 1
        d = jstNow.getDate()
    }
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateKey = `${y}-${pad(m)}-${pad(d)}`
    const startOfDay = new Date(`${dateKey}T00:00:00+09:00`).toISOString()
    const endOfDay = new Date(`${dateKey}T23:59:59.999+09:00`).toISOString()

    try {
        // 2. 昨日の未報告スケジュールを取得
        const { data: schedules, error } = await supabase
            .from('lesson_schedules')
            .select(`
                id, coach_id, student_id, start_time, end_time, location, attendance_type, is_reported,
                students ( id, full_name, second_student_name ),
                profiles:coach_id ( id, full_name )
            `)
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay)
            .not('student_id', 'is', null)
            .or('is_reported.is.null,is_reported.eq.false')

        if (error) {
            console.error('[Report Request] Supabase Error:', error)
            return { success: false, error: error.message }
        }
        if (!schedules || schedules.length === 0) {
            return { success: true, message: 'No unreported schedules', target_date: dateKey, processed: 0 }
        }

        // 3. 送信済みフラグの取得
        const flagKeys = schedules.map(s => `report_request_sent:${s.id}`)
        const { data: sentFlags } = await supabase
            .from('app_configs')
            .select('key')
            .in('key', flagKeys)
        const sentSet = new Set((sentFlags || []).map(f => f.key))

        // 4. コーチの Google Chat Webhook
        const { data: botConfigs } = await supabase
            .from('line_bot_configs')
            .select('coach_id, gchat_webhook_id')
        const botConfigMap = new Map((botConfigs || []).map(b => [b.coach_id, b]))
        const { data: webhooks } = await supabase
            .from('google_chat_webhooks')
            .select('id, webhook_url')
            .eq('active', true)
        const webhookMap = new Map((webhooks || []).map(w => [w.id, w.webhook_url]))

        // 5. テンプレート（メッセージ設定で編集可能）
        const { data: tmpl } = await supabase
            .from('email_templates')
            .select('body')
            .eq('key', 'lesson_report_request_coach')
            .maybeSingle()
        const bodyTmpl = tmpl?.body || DEFAULT_REPORT_REQUEST_COACH_BODY

        const fmt = (iso: string) => {
            const j = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
            const wd = ['日', '月', '火', '水', '木', '金', '土'][j.getDay()]
            return {
                date: `${j.getMonth() + 1}月${j.getDate()}日(${wd})`,
                time: `${String(j.getHours()).padStart(2, '0')}:${String(j.getMinutes()).padStart(2, '0')}`
            }
        }

        const results: any[] = []
        for (const schedule of schedules) {
            const student = schedule.students as any
            const coach = schedule.profiles as any
            const flagKey = `report_request_sent:${schedule.id}`
            if (!student || sentSet.has(flagKey)) continue

            const webhookId = schedule.coach_id ? botConfigMap.get(schedule.coach_id)?.gchat_webhook_id : null
            const webhookUrl = webhookId ? webhookMap.get(webhookId) : null
            if (!webhookUrl) {
                results.push({ schedule_id: schedule.id, student_name: student.full_name, skipped: 'no_webhook' })
                continue
            }

            // 2名レッスンの表示名
            const second = student.second_student_name?.trim()
            let displayName = `${student.full_name} 様`
            let plainName = student.full_name
            if (second) {
                if (schedule.attendance_type === 'student2') {
                    displayName = `${second} 様`; plainName = second
                } else if (schedule.attendance_type !== 'student1') {
                    displayName = `${student.full_name} 様・${second} 様`; plainName = `${student.full_name}・${second}`
                }
            }

            const s = fmt(schedule.start_time)
            const e = schedule.end_time ? fmt(schedule.end_time) : null
            const timeStr = e ? `${s.time}〜${e.time}` : s.time
            const reportUrl = buildCoachReportUrl(schedule.id)

            let message = bodyTmpl
                .replace(/{{name}}\s*様/g, displayName)
                .replace(/{{student_name}}\s*様/g, displayName)
                .replace(/{{name}}/g, plainName)
                .replace(/{{student_name}}/g, plainName)
                .replace(/{{lesson_date}}/g, `${s.date} ${timeStr}`)
                .replace(/{{date}}/g, s.date)
                .replace(/{{time}}/g, timeStr)
                .replace(/{{coach_name}}/g, coach?.full_name || '担当コーチ')
                .replace(/{{location}}/g, schedule.location || '未設定')
            if (message.includes('{{report_url}}')) {
                message = message.replace(/{{report_url}}/g, reportUrl)
            } else {
                message = `${message.trimEnd()}\n\n▼レッスン報告フォーム\n${reportUrl}`
            }

            let sent = false
            if (dryRun) {
                console.log(`[DRY RUN] Would send report request to coach webhook for schedule ${schedule.id}`)
                sent = true
            } else {
                sent = await sendGoogleChatMessage(webhookUrl, message)
                if (sent) {
                    await supabase.from('app_configs').upsert({
                        key: flagKey,
                        value: new Date().toISOString(),
                        description: 'コーチ宛てレッスン報告依頼の送信済みフラグ',
                        updated_at: new Date().toISOString()
                    })
                }
            }

            results.push({
                schedule_id: schedule.id,
                student_name: student.full_name,
                coach_name: coach?.full_name,
                gchat_sent: sent,
                ...(dryRun ? { preview: message } : {})
            })
        }

        return { success: true, target_date: dateKey, processed: results.length, details: results }
    } catch (e: any) {
        console.error('[Report Request] Unexpected error:', e)
        return { success: false, error: e.message }
    }
}
