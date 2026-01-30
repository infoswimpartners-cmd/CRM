
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'
import { startOfDay, addDays, endOfDay, differenceInDays } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        // 1. Find overage lessons that are due for billing
        // Logic: 
        // - is_overage = true
        // - billing_status = 'future_billing' or 'pending'
        // - billing_scheduled_at <= Now (i.e. It is past 12:00 on the day before)

        const now = new Date().toISOString()

        const { data: schedules, error } = await supabase
            .from('lesson_schedules')
            .select(`
                id,
                start_time,
                title,
                student_id,
                billing_status,
                students (
                    stripe_customer_id,
                    membership_types:membership_type_id (
                        fee,
                        monthly_lesson_limit
                    )
                )
            `)
            .eq('is_overage', true)
            .in('billing_status', ['future_billing', 'pending'])
            .lte('billing_scheduled_at', now)

        if (error) throw error

        if (!schedules || schedules.length === 0) {
            return NextResponse.json({ message: 'No overage lessons to bill' })
        }

        const results = []

        for (const schedule of schedules) {
            // No need for daysUntil check as query handles timing
            // const daysUntil = differenceInDays(new Date(schedule.start_time), new Date())

            const student = schedule.students
            // @ts-ignore
            const stripeCustomerId = student?.stripe_customer_id

            if (!stripeCustomerId) {
                results.push({ id: schedule.id, status: 'skipped_no_customer' })
                continue
            }

            // Calculate Price
            // @ts-ignore
            const membership = Array.isArray(student.membership_types) ? student.membership_types[0] : student.membership_types
            const fee = membership?.fee || 0
            const limit = membership?.monthly_lesson_limit || 0

            let amount = 8800
            if (fee && limit > 0) {
                amount = Math.floor(fee / limit)
            }

            // Create Invoice Item
            try {
                const description = `追加レッスン料 (${new Date(schedule.start_time).toLocaleDateString()}): ${schedule.title}`

                const invoiceItem = await stripe.invoiceItems.create({
                    customer: stripeCustomerId,
                    amount: amount,
                    currency: 'jpy',
                    description: description
                })

                // Update DB (Save Invoice Item ID)
                await supabase
                    .from('lesson_schedules')
                    .update({
                        billing_status: 'ready_to_invoice',
                        stripe_invoice_item_id: invoiceItem.id
                    })
                    .eq('id', schedule.id)

                results.push({ id: schedule.id, status: 'billed', amount, invoiceItemId: invoiceItem.id })

            } catch (e: any) {
                console.error(`Failed to bill schedule ${schedule.id}:`, e)
                results.push({ id: schedule.id, status: 'error', error: e.message })
            }
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            details: results
        })

    } catch (error: any) {
        console.error('Overage Cron Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
