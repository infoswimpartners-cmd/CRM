
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { format } from 'date-fns'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabase = createAdminClient()

        // Find items to invoice
        const now = new Date().toISOString()
        console.log(`[ExecuteBillings] Checking for approved billings <= ${now}`)

        const { data: schedules, error } = await supabase
            .from('lesson_schedules')
            .select(`
                id, start_time, title, price,
                student:students (
                    stripe_customer_id
                )
            `)
            .eq('billing_status', 'approved')
            .lte('billing_scheduled_at', now)

        if (error) {
            console.error('Error fetching schedules:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!schedules || schedules.length === 0) {
            console.log('[ExecuteBillings] No approved billings due for execution.')
            return NextResponse.json({ message: 'No billings due' })
        }

        let successCount = 0
        let failCount = 0

        for (const schedule of schedules) {
            // @ts-ignore
            const customerId = schedule.student?.stripe_customer_id
            const price = schedule.price

            if (!customerId || !price) {
                console.error(`[ExecuteBillings] Missing customerId or price for schedule ${schedule.id}`)
                failCount++
                continue
            }

            try {
                // Create Invoice Item
                const description = `追加レッスン料 (${format(new Date(schedule.start_time), 'yyyy/MM/dd')}): ${schedule.title}`

                const invoiceItem = await stripe.invoiceItems.create({
                    customer: customerId,
                    amount: price,
                    currency: 'jpy',
                    description: description
                })

                // Update DB
                const { error: updateError } = await supabase
                    .from('lesson_schedules')
                    .update({
                        billing_status: 'invoiced',
                        stripe_invoice_item_id: invoiceItem.id
                    })
                    .eq('id', schedule.id)

                if (updateError) throw updateError

                console.log(`[ExecuteBillings] Success for schedule ${schedule.id}. Item: ${invoiceItem.id}`)
                successCount++

            } catch (e: any) {
                console.error(`[ExecuteBillings] Failed for schedule ${schedule.id}:`, e)
                failCount++
            }
        }

        return NextResponse.json({
            success: true,
            processed: schedules.length,
            succeeded: successCount,
            failed: failCount
        })

    } catch (error: any) {
        console.error('Cron Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
