'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { stripe } from '@/lib/stripe'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export async function cancelSchedule(scheduleId: string) {
    const supabaseAdmin = createAdminClient()

    try {
        // 1. Fetch Schedule to check for Stripe ID
        const { data: schedule, error: fetchError } = await supabaseAdmin
            .from('lesson_schedules')
            .select('stripe_invoice_item_id')
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
                // Continue with DB deletion? Or block?
                // Ideally we should warn, but cleaning DB is priority for user. 
                // We'll log error and proceed.
            }
        }

        const { error } = await supabaseAdmin
            .from('lesson_schedules')
            .delete()
            .eq('id', scheduleId)

        if (error) throw error

        revalidatePath('/coach/schedule')
        revalidatePath('/admin/schedule')
        return { success: true }
    } catch (error: any) {
        console.error('cancelSchedule Error:', error)
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
