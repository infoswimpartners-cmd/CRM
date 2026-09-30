import { sendGoogleChatMessage } from '@/lib/google-chat'

interface LessonReportNotificationParams {
    coachId: string
    studentName: string
    studentId?: string | null
    lessonDate: string
    location: string
    lessonMasterId: string
    menuDescription?: string | null
    scheduleId?: string | null
    attendanceType?: string | null
}

/**
 * 日本時間 (JST) での日時・時刻フォーマッター
 */
function formatJSTDateTime(dateStrOrIso: string, endTimeIso?: string | null) {
    try {
        const d = new Date(dateStrOrIso)
        if (isNaN(d.getTime())) {
            return dateStrOrIso
        }

        const jstStr = d.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
        const jstDate = new Date(jstStr)

        const year = jstDate.getFullYear()
        const month = jstDate.getMonth() + 1
        const day = jstDate.getDate()
        const weekday = ['日', '月', '火', '水', '木', '金', '土'][jstDate.getDay()]
        const dateFormatted = `${year}年${month}月${day}日(${weekday})`

        if (endTimeIso) {
            const endD = new Date(endTimeIso)
            if (!isNaN(endD.getTime())) {
                const endJstStr = endD.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
                const endJstDate = new Date(endJstStr)

                const startH = String(jstDate.getHours()).padStart(2, '0')
                const startM = String(jstDate.getMinutes()).padStart(2, '0')
                const endH = String(endJstDate.getHours()).padStart(2, '0')
                const endM = String(endJstDate.getMinutes()).padStart(2, '0')

                return `${dateFormatted} ${startH}:${startM}〜${endH}:${endM}`
            }
        }

        return dateFormatted
    } catch {
        return dateStrOrIso
    }
}

/**
 * コーチ専用の Google Chat Webhook URL を解決する共通関数
 */
export async function getCoachGoogleChatWebhookUrl(
    supabaseAdmin: any,
    coachId: string,
    coachNameHint?: string
): Promise<{ webhookUrl: string | null; coachName: string }> {
    let coachName = coachNameHint || ''

    if (!coachName) {
        const { data: coachProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name')
            .eq('id', coachId)
            .maybeSingle()
        coachName = coachProfile?.full_name || ''
    }

    let webhookUrl: string | null = null

    // 1. line_bot_configs から該当コーチの gchat_webhook_id を取得
    const { data: botConfig } = await supabaseAdmin
        .from('line_bot_configs')
        .select('gchat_webhook_id, google_chat_webhooks(id, space_name, webhook_url)')
        .eq('coach_id', coachId)
        .maybeSingle()

    if (botConfig?.google_chat_webhooks?.webhook_url) {
        webhookUrl = botConfig.google_chat_webhooks.webhook_url
    }

    // 2. 未設定の場合は google_chat_webhooks の space_name からコーチ名で検索
    if (!webhookUrl && coachName) {
        const cleanCoachName = coachName.replace(/[\s　]+/g, '')
        const { data: allWebhooks } = await supabaseAdmin
            .from('google_chat_webhooks')
            .select('id, space_name, webhook_url')
            .eq('active', true)

        if (allWebhooks && allWebhooks.length > 0) {
            const lastName = cleanCoachName.substring(0, 2)
            const matched = allWebhooks.find((w: any) =>
                w.space_name && (
                    w.space_name.includes(cleanCoachName) ||
                    (lastName.length >= 2 && w.space_name.includes(lastName))
                )
            )
            if (matched?.webhook_url) {
                webhookUrl = matched.webhook_url
            }
        }
    }

    return { webhookUrl, coachName }
}

/**
 * コーチがレッスン報告を提出した際に、コーチ専用Google Chatスペースへ通知を送信する
 */
export async function notifyCoachLessonReportSubmitted(
    supabaseAdmin: any,
    params: LessonReportNotificationParams
): Promise<boolean> {
    try {
        const {
            coachId,
            studentName,
            studentId,
            lessonDate,
            location,
            lessonMasterId,
            menuDescription,
            scheduleId,
            attendanceType
        } = params

        if (!coachId) {
            console.log('[Coach Report Notify] No coachId provided, skipping.')
            return false
        }

        // 1. コーチ情報および専用 Google Chat Webhook URL の取得
        const { webhookUrl, coachName } = await getCoachGoogleChatWebhookUrl(supabaseAdmin, coachId)

        if (!webhookUrl) {
            console.log(`[Coach Report Notify] No Google Chat webhook found for coach: ${coachName} (${coachId})`)
            return false
        }

        // 3. レッスン種別名の取得
        let lessonMasterName = 'レッスン'
        if (lessonMasterId) {
            const { data: master } = await supabaseAdmin
                .from('lesson_masters')
                .select('name')
                .eq('id', lessonMasterId)
                .single()
            if (master?.name) {
                lessonMasterName = master.name
            }
        }

        // 4. 生徒名表示の整形（2名レッスンの対応）
        let formattedStudentName = studentName ? `${studentName} 様` : '生徒 様'
        if (studentId) {
            const { data: student } = await supabaseAdmin
                .from('students')
                .select('full_name, second_student_name')
                .eq('id', studentId)
                .single()

            if (student) {
                const secondStudentName = student.second_student_name?.trim()
                if (secondStudentName) {
                    if (attendanceType === 'student2') {
                        formattedStudentName = `${secondStudentName} 様`
                    } else if (attendanceType === 'student1') {
                        formattedStudentName = `${student.full_name} 様`
                    } else {
                        formattedStudentName = `${student.full_name} 様・${secondStudentName} 様`
                    }
                } else if (student.full_name) {
                    formattedStudentName = `${student.full_name} 様`
                }
            }
        }

        // 5. 日時の整形（スケジュールがある場合は時刻範囲を含める）
        let formattedDateTime = formatJSTDateTime(lessonDate)
        if (scheduleId) {
            const { data: sched } = await supabaseAdmin
                .from('lesson_schedules')
                .select('start_time, end_time')
                .eq('id', scheduleId)
                .single()

            if (sched?.start_time) {
                formattedDateTime = formatJSTDateTime(sched.start_time, sched.end_time)
            }
        }

        // 6. メニュー内容 / メモの整形
        const cleanMenu = menuDescription?.trim()
        const menuText = cleanMenu ? cleanMenu : '(なし)'

        // 7. メッセージ本文の組み立て
        const message = [
            '報告ありがとうございます！引き続きよろしくお願いします！',
            '',
            '【レッスン報告受付完了】',
            `・生徒名: ${formattedStudentName}`,
            `・日時: ${formattedDateTime}`,
            `・場所: ${location || '未設定'}`,
            `・レッスン種別: ${lessonMasterName}`,
            '・メニュー内容 / メモ:',
            menuText
        ].join('\n')

        // 8. Google Chat へ送信
        const sent = await sendGoogleChatMessage(webhookUrl, message)
        if (sent) {
            console.log(`[Coach Report Notify] Successfully sent report confirmation to coach: ${coachName}`)
        } else {
            console.warn(`[Coach Report Notify] Failed to send message to webhook for coach: ${coachName}`)
        }
        return sent
    } catch (error) {
        console.error('[Coach Report Notify] Error in notifyCoachLessonReportSubmitted:', error)
        return false
    }
}

export interface EnrollmentCoachNotificationParams {
    studentId?: string | null
    studentName: string
    planName: string
    startDate: string
    contactEmail?: string | null
    lineUserId?: string | null
    coachId?: string | null
}

/**
 * 顧客が入会完了した際に、担当コーチの専用Google Chatスペースへ通知を送信する
 */
export async function notifyCoachEnrollmentCompleted(
    supabaseAdmin: any,
    params: EnrollmentCoachNotificationParams
): Promise<boolean> {
    try {
        const { studentId, studentName, planName, startDate, contactEmail, lineUserId } = params
        let targetCoachId = params.coachId || null
        let resolvedStudentId = studentId || null

        // 1. 生徒情報から coach_id を取得
        if (!targetCoachId && resolvedStudentId) {
            const { data: student } = await supabaseAdmin
                .from('students')
                .select('id, coach_id, contact_email, contact_phone, line_user_id')
                .eq('id', resolvedStudentId)
                .maybeSingle()

            if (student?.coach_id) {
                targetCoachId = student.coach_id
            }
        }

        // 2. LINE User ID または Email から生徒を検索して coach_id を探す
        if (!targetCoachId && (lineUserId || contactEmail)) {
            let query = supabaseAdmin.from('students').select('id, coach_id, contact_email, contact_phone, line_user_id')
            if (lineUserId) {
                query = query.eq('line_user_id', lineUserId)
            } else if (contactEmail) {
                query = query.ilike('contact_email', contactEmail.trim())
            }
            const { data: student } = await query.maybeSingle()
            if (student) {
                resolvedStudentId = student.id
                if (student.coach_id) {
                    targetCoachId = student.coach_id
                }
            }
        }

        // 3. 生徒の coach_id が未設定の場合、lesson_schedules から直近のレッスン担当コーチを検索
        if (!targetCoachId && resolvedStudentId) {
            const { data: schedules } = await supabaseAdmin
                .from('lesson_schedules')
                .select('coach_id')
                .eq('student_id', resolvedStudentId)
                .order('start_time', { ascending: false })
                .limit(1)

            if (schedules && schedules.length > 0 && schedules[0].coach_id) {
                targetCoachId = schedules[0].coach_id
                console.log(`[Coach Enrollment Notify] Found coach ${targetCoachId} from lesson_schedules for student ${resolvedStudentId}`)

                // 生徒テーブルの coach_id を自動補完
                await supabaseAdmin
                    .from('students')
                    .update({ coach_id: targetCoachId })
                    .eq('id', resolvedStudentId)
            }
        }

        // 4. それでも見つからない場合、leads テーブルから assigned_coach_id を検索
        if (!targetCoachId) {
            let leadQuery = supabaseAdmin.from('leads').select('assigned_coach_id')
            if (lineUserId) {
                leadQuery = leadQuery.eq('line_user_id', lineUserId)
            } else if (contactEmail) {
                leadQuery = leadQuery.ilike('email', contactEmail.trim())
            }
            const { data: lead } = await leadQuery
                .not('assigned_coach_id', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (lead?.assigned_coach_id) {
                targetCoachId = lead.assigned_coach_id
                console.log(`[Coach Enrollment Notify] Found coach ${targetCoachId} from leads`)
                if (resolvedStudentId) {
                    await supabaseAdmin
                        .from('students')
                        .update({ coach_id: targetCoachId })
                        .eq('id', resolvedStudentId)
                }
            }
        }

        if (!targetCoachId) {
            console.log(`[Coach Enrollment Notify] No coach found for student: ${studentName} (${resolvedStudentId || 'no-id'})`)
            return false
        }

        // 5. コーチの Google Chat Webhook URL を解決
        const { webhookUrl, coachName } = await getCoachGoogleChatWebhookUrl(supabaseAdmin, targetCoachId)

        if (!webhookUrl) {
            console.log(`[Coach Enrollment Notify] No Google Chat webhook found for coach: ${coachName} (${targetCoachId})`)
            return false
        }

        // 6. メッセージ本文の組み立て
        const message = [
            '🎉 *【担当生徒様 本入会手続き完了のお知らせ】*',
            '',
            `担当の *${studentName} 様* の本入会手続きが完了いたしました！`,
            '',
            '■ 顧客名： ' + `${studentName} 様`,
            '■ ご登録プラン： ' + planName,
            '■ 定期課金開始日： ' + startDate,
            '',
            '※定期課金開始日までに受講されるレッスンは都度利用扱いとして翌月合算請求されます。',
            '今後のレッスン枠の確保や日程調整等のサポートをよろしくお願いいたします🏊‍♂️✨'
        ].join('\n')

        // 7. Google Chat へ送信
        const sent = await sendGoogleChatMessage(webhookUrl, message)
        if (sent) {
            console.log(`[Coach Enrollment Notify] Successfully sent enrollment notification to coach: ${coachName} (${targetCoachId})`)
        } else {
            console.warn(`[Coach Enrollment Notify] Failed to send message to webhook for coach: ${coachName}`)
        }
        return sent
    } catch (error) {
        console.error('[Coach Enrollment Notify] Error in notifyCoachEnrollmentCompleted:', error)
        return false
    }
}

