'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { stripe } from '@/lib/stripe'

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
        const { data, error } = await supabaseAdmin
            .from('students')
            .select(`
                id,
                full_name,
                status,
                membership_types:membership_type_id (
                    default_lesson_master_id,
                    name
                )
            `)
            .eq('coach_id', coachId)

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
