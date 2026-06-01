'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { stripe } from '@/lib/stripe'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'


export async function cancelSchedule(scheduleId: string) {
    const supabaseAdmin = createAdminClient()

    try {
        // 1. Fetch Schedule to check for Stripe ID and Google Event ID
        const { data: schedule, error: fetchError } = await supabaseAdmin
            .from('lesson_schedules')
            .select('stripe_invoice_item_id, student_id, google_event_id, coach_id')
            .eq('id', scheduleId)
            .single()

        if (fetchError || !schedule) throw new Error('Schedule not found')

        // 2. Delete from Stripe if exists
        if (schedule.stripe_invoice_item_id) {
            try {
                await stripe.invoiceItems.del(schedule.stripe_invoice_item_id)
                console.log(`[CancelSchedule] Deleted Stripe Invoice Item: ${schedule.stripe_invoice_item_id}`)
            } catch (stripeError: any) {
                console.error(`[CancelSchedule] Failed to delete Stripe Item (${schedule.stripe_invoice_item_id}):`, stripeError)
            }
        }

        // 3. Delete from Google Calendar if exists
        if (schedule.google_event_id) {
            try {
                const { deleteCalendarEvent, getAdminRefreshToken, getCoachRefreshToken } = await import('@/lib/google-calendar')
                // 優先的にそのコーチ自身のトークンを取得
                let token = await getCoachRefreshToken(supabaseAdmin, schedule.coach_id)
                
                // 未連携の場合は管理者のトークンをフォールバックとして使用
                if (!token) {
                    token = await getAdminRefreshToken(supabaseAdmin)
                }

                if (token) {
                    await deleteCalendarEvent(token, schedule.google_event_id)
                }
            } catch (calErr) {
                console.error(`[CancelSchedule] Failed to delete Google Calendar Event (${schedule.google_event_id}):`, calErr)
            }
        }

        const { error } = await supabaseAdmin
            .from('lesson_schedules')
            .delete()
            .eq('id', scheduleId)

        if (error) throw error

        revalidatePath('/coach/schedule')
        revalidatePath('/admin/schedule')
        if (schedule.student_id) {
            revalidatePath(`/customers/${schedule.student_id}`)
        }
        revalidatePath('/customers')
        return { success: true }
    } catch (error: any) {
        console.error('cancelSchedule Error:', error)
        return { success: false, error: error.message }
    }
}

// ─── スケジュール更新（Googleカレンダー同期込み） ────────────────────────────
interface UpdateScheduleParams {
    scheduleId: string
    title: string
    startTime: string  // ISO 8601
    endTime: string    // ISO 8601
    location?: string
    notes?: string
    studentId?: string | null
    coachId?: string | null
    attendance_type?: string
}

export async function updateScheduleWithCalendar(params: UpdateScheduleParams) {
    const supabaseAdmin = createAdminClient()

    try {
        // 1. 既存スケジュール（google_event_id）を取得
        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('lesson_schedules')
            .select('google_event_id')
            .eq('id', params.scheduleId)
            .single()

        if (fetchError) throw fetchError

        // 2. DBを更新
        const updatePayload: Record<string, any> = {
            title: params.title,
            start_time: params.startTime,
            end_time: params.endTime,
            location: params.location || null,
            notes: params.notes || null,
            student_id: params.studentId || null,
            attendance_type: params.attendance_type || 'both',
        }
        if (params.coachId) updatePayload.coach_id = params.coachId

        const { error: updateError } = await supabaseAdmin
            .from('lesson_schedules')
            .update(updatePayload)
            .eq('id', params.scheduleId)

        if (updateError) throw updateError

        // 3. Googleカレンダーへ同期
        try {
            const { updateCalendarEvent, createCalendarEvent, getAdminRefreshToken } = await import('@/lib/google-calendar')
            const adminRefreshToken = await getAdminRefreshToken(supabaseAdmin)

            if (adminRefreshToken) {
                const calPayload = {
                    summary: params.title,
                    description: params.notes || '',
                    location: params.location || '',
                    start: params.startTime,
                    end: params.endTime,
                }

                if (existing?.google_event_id) {
                    // 既存イベントを更新
                    await updateCalendarEvent(adminRefreshToken, existing.google_event_id, calPayload)
                } else {
                    // イベントが未作成の場合は新規作成してIDを保存
                    const newEventId = await createCalendarEvent(adminRefreshToken, calPayload)
                    if (newEventId) {
                        await supabaseAdmin
                            .from('lesson_schedules')
                            .update({ google_event_id: newEventId })
                            .eq('id', params.scheduleId)
                    }
                }
            }
        } catch (calErr) {
            // カレンダー同期失敗はDB更新の成功に影響させない
            console.error('[updateScheduleWithCalendar] Googleカレンダー同期失敗:', calErr)
        }

        revalidatePath('/coach/schedule')
        revalidatePath('/admin/schedule')
        if (params.studentId) {
            revalidatePath(`/customers/${params.studentId}`)
        }
        revalidatePath('/customers')
        return { success: true }

    } catch (error: any) {
        console.error('updateScheduleWithCalendar Error:', error)
        return { success: false, error: error.message }
    }
}


export async function getStudentsForCoach(coachId: string) {
    const supabaseAdmin = createAdminClient()

    try {
        let query = supabaseAdmin
            .from('students')
            .select(`
                id,
                full_name,
                second_student_name,
                status,
                coach_id,
                student_coaches!inner(coach_id),
                membership_types:membership_type_id (
                    default_lesson_master_id,
                    name
                )
            `)

        if (coachId && coachId !== 'all') {
            query = query.eq('student_coaches.coach_id', coachId)
        }

        const { data, error } = await query

        if (error) throw error

        // Transform for frontend if needed or return structure
        return {
            success: true,
            data: data.map((s: any) => ({
                ...s,
                membership_name: Array.isArray(s.membership_types)
                    ? s.membership_types[0]?.name
                    : s.membership_types?.name,
                default_master_id: Array.isArray(s.membership_types)
                    ? s.membership_types[0]?.default_lesson_master_id
                    : s.membership_types?.default_lesson_master_id
            }))
        }

    } catch (error: any) {
        console.error('getStudentsForCoach Error:', error)
        return { success: false, error: error.message }
    }
}

export async function getLessonMasters() {
    const supabaseAdmin = createAdminClient()

    try {
        const { data, error } = await supabaseAdmin
            .from('lesson_masters')
            .select('id, name')
            .eq('active', true)
            .order('display_order', { ascending: true })

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        console.error('getLessonMasters Error:', error)
        return { success: false, error: error.message }
    }
}

export async function approveSchedule(scheduleId: string) {
    const supabaseAdmin = createAdminClient()

    try {
        // 1. Get Schedule Details
        const { data: schedule, error: fetchError } = await supabaseAdmin
            .from('lesson_schedules')
            .select('*, students(full_name, current_tickets)')
            .eq('id', scheduleId)
            .single()

        if (fetchError || !schedule) throw new Error('Schedule not found')
        if (!schedule.student_id) throw new Error('生徒が紐付けられていません')

        // 1.5 Ticket Consumption Logic
        const currentTickets = (schedule.students as any)?.current_tickets || 0
        if (currentTickets > 0) {
            const newBalance = currentTickets - 1

            // Update Student
            const { error: ticketError } = await supabaseAdmin
                .from('students')
                .update({ current_tickets: newBalance })
                .eq('id', schedule.student_id)

            if (ticketError) {
                console.error('Ticket Update Error:', ticketError)
                throw new Error('チケット残高の更新に失敗しました')
            }

            // Insert Transaction
            await supabaseAdmin
                .from('ticket_transactions')
                .insert({
                    student_id: schedule.student_id,
                    change_amount: -1,
                    balance_after: newBalance,
                    reason: 'レッスン消化',
                    related_id: schedule.id
                })
        }

        // 2. Update Schedule Status
        const { error: updateError } = await supabaseAdmin
            .from('lesson_schedules')
            .update({ status: 'booked' })
            .eq('id', scheduleId)

        if (updateError) throw updateError

        // 2.5 Create Notification
        const { error: notificationError } = await supabaseAdmin
            .from('notifications')
            .insert({
                student_id: schedule.student_id,
                title: 'レッスンが確定しました',
                body: `${format(new Date(schedule.start_time), 'M月d日 HH:mm', { locale: ja })}〜 のレッスン予約が確定しました。`,
                action_url: '/member/reservation',
                is_read: false,
                type: 'success'
            })

        if (notificationError) {
            console.error('Notification Insert Error:', notificationError)
            // Don't throw, just log
        }

        // 3. Insert into Lessons
        // Note: We do NOT insert into `lessons` table here anymore, 
        // because `lessons` is used for "Completed/Reported" lessons in our logic.
        // Or if it IS used for "Upcoming Planned Lessons", we can insert it.
        // Looking at `MemberDashboard`, `nextLesson` is fetched from `lessons` table.
        // So we MUST insert into `lessons` for it to appear as "Next Lesson".

        const { error: insertError } = await supabaseAdmin
            .from('lessons')
            .insert({
                student_id: schedule.student_id,
                coach_id: schedule.coach_id,
                lesson_date: schedule.start_time,
                location: schedule.location || '未定',
                student_name: schedule.students?.full_name || '不明',
                // lesson_master_id is nullable? If required, we have a problem.
                // Assuming nullable or we can update it later.
            })

        if (insertError) {
            console.error('Lesson Insert Error:', insertError)
            // If lessons table has strict constraints, this might fail.
            // If it fails, "Next Lesson" won't show up.
            throw new Error('レッスンデータの作成に失敗しました')
        }

        revalidatePath('/coach/schedule')
        return { success: true }

    } catch (error: any) {
        console.error('approveSchedule Error:', error)
        return { success: false, error: error.message }
    }
}

export async function getPendingSchedulesAction(coachId: string) {
    const supabaseAdmin = createAdminClient()

    try {
        // 1. 未報告（is_reported = false）のスケジュールを取得
        const { data: schedules, error } = await supabaseAdmin
            .from('lesson_schedules')
            .select(`
                *,
                students (
                    id,
                    full_name,
                    second_student_name,
                    is_two_person_lesson,
                    is_default_distant_option
                )
            `)
            .eq('coach_id', coachId)
            .eq('is_reported', false)
            .order('start_time', { ascending: false })

        if (error) throw error
        if (!schedules || schedules.length === 0) return { success: true, data: [] }

        // 日本時間 (JST) ベースの日付文字列 (YYYY-MM-DD) に安全に変換するヘルパー
        const toJstDateString = (dateInput: string | Date | null | undefined): string => {
            if (!dateInput) return ''
            try {
                const d = new Date(dateInput)
                if (isNaN(d.getTime())) return ''
                const formatter = new Intl.DateTimeFormat('ja-JP', {
                    timeZone: 'Asia/Tokyo',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                })
                return formatter.format(d).replace(/\//g, '-')
            } catch (e) {
                return ''
            }
        }

        // 2. 二重報告を防ぐため、すでに lessons テーブルに報告データが存在するスケジュールを除外する
        // コーチに関連する直近のレッスン報告を最大1000件取得
        const { data: reportedLessons } = await supabaseAdmin
            .from('lessons')
            .select('student_id, student_name, lesson_date')
            .eq('coach_id', coachId)
            .order('lesson_date', { ascending: false })
            .limit(1000)

        if (reportedLessons && reportedLessons.length > 0) {
            // 報告レッスン側の日付をすべて JST ベースの YYYY-MM-DD に変換
            const reportsWithJstDate = reportedLessons.map(l => ({
                ...l,
                jst_lesson_date: toJstDateString(l.lesson_date)
            })).filter(l => l.jst_lesson_date)

            // 報告が存在するスケジュールを除外
            const filteredSchedules = schedules.filter(s => {
                if (!s.start_time) return true
                const sDateStr = toJstDateString(s.start_time)
                if (!sDateStr) return true

                const hasReport = reportsWithJstDate.some(l => {
                    // 日付が一致していることを前提とする
                    if (l.jst_lesson_date !== sDateStr) return false

                    // 1. student_idが一致している場合
                    if (s.student_id && l.student_id === s.student_id) {
                        return true
                    }

                    // 2. student_idがnullまたは一致しない場合の生徒名によるフォールバック
                    const sName = s.students?.full_name || ''
                    const sSecondName = s.students?.second_student_name || ''
                    const lName = l.student_name || ''

                    if (lName && sName) {
                        if (lName === sName || lName.includes(sName) || sName.includes(lName)) {
                            return true
                        }
                        if (sSecondName && (lName === sSecondName || lName.includes(sSecondName) || sSecondName.includes(lName))) {
                            return true
                        }
                    }
                    return false
                })

                return !hasReport
            })

            return { success: true, data: filteredSchedules }
        }

        return { success: true, data: schedules }
    } catch (error: any) {
        console.error('getPendingSchedulesAction Error:', error)
        return { success: false, error: error.message }
    }
}
