
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { getTicketPriceIdFromMembershipName } from '@/lib/constants'

// Cron Job: scheduled to run every 10-30 mins
// Checks for unbilled schedules and sends invoices.

export async function GET(req: NextRequest) {
    const supabase = createAdminClient()
    const now = new Date()

    console.log(`[Invoice Scheduler] Running at ${now.toISOString()}`)

    try {
        // 1. Fetch Candidates from Lesson Schedules
        // Criteria: 
        // - stripe_invoice_item_id is NULL (Unbilled)
        // - created_at < 30 mins ago
        // - start_time <= 7 days from now

        const safetyBufferDate = new Date(now.getTime() - 30 * 60000) // 30 mins ago
        const lookaheadDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days future

        // We use @ts-ignore because 'stripe_invoice_item_id' column might not exist in types yet
        const { data: schedules, error } = await supabase
            .from('lesson_schedules')
            .select(`
                *,
                students (
                    id,
                    stripe_customer_id,
                    membership_types!membership_type_id (
                        name
                    )
                )
            `)
            // @ts-ignore
            .is('stripe_invoice_item_id', null)
            .lt('created_at', safetyBufferDate.toISOString())
            .order('start_time', { ascending: true })
            .limit(50)

        if (error) {
            console.error('[Invoice Scheduler] DB Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!schedules || schedules.length === 0) {
            return NextResponse.json({ processed: 0, status: 'ok' })
        }

        let processedCount = 0

        for (const schedule of schedules) {
            const student = schedule.students
            if (!student || !student.stripe_customer_id) {
                console.warn(`[Invoice Scheduler] Skipping Schedule ${schedule.id}: No Stripe Customer linked.`)
                continue
            }

            const startTime = new Date(schedule.start_time)
            if (isNaN(startTime.getTime())) continue

            // 7 Day Rule
            if (startTime > lookaheadDate) continue

            // Determine Duration from Title or Notes
            let duration = 60
            const text = (schedule.title + ' ' + (schedule.notes || '')).toLowerCase()
            if (text.includes('90')) {
                duration = 90
            }

            // Determine Price
            // @ts-ignore
            const membershipName = student.membership_types?.name || null
            const priceId = getTicketPriceIdFromMembershipName(membershipName, duration)

            console.log(`[Invoice Scheduler] Processing Schedule ${schedule.id}: Price ${priceId} (${duration}m)`)

            try {
                // 1. Create Draft Invoice
                // Due date = Start Time - 1 day
                const dueDate = new Date(startTime)
                dueDate.setDate(dueDate.getDate() - 1)
                let dueDateUnix = Math.floor(dueDate.getTime() / 1000)

                // Ensure Due Date is in the future
                const nowUnix = Math.floor(Date.now() / 1000)
                if (dueDateUnix <= nowUnix) {
                    dueDateUnix = nowUnix + 86400
                }

                const draftInvoice = await stripe.invoices.create({
                    customer: student.stripe_customer_id,
                    collection_method: 'send_invoice',
                    due_date: dueDateUnix,
                    auto_advance: false // Draft
                })

                // 2. Create Invoice Item (Linked)
                // Fetch Price Details
                const priceObj = await stripe.prices.retrieve(priceId);
                const amount = priceObj.unit_amount || 0;
                const currency = priceObj.currency;

                const invoiceItem = await stripe.invoiceItems.create({
                    customer: student.stripe_customer_id,
                    amount: amount,
                    currency: currency,
                    description: `追加レッスン (${new Date(schedule.start_time).toLocaleDateString()})`,
                    metadata: {
                        schedule_id: schedule.id
                    },
                    invoice: draftInvoice.id
                })

                // 3. Finalize
                await stripe.invoices.finalizeInvoice(draftInvoice.id)

                // 3. Update Schedule with Invoice Item ID
                const { error: updateError } = await supabase
                    .from('lesson_schedules')
                    .update({
                        // @ts-ignore
                        stripe_invoice_item_id: invoiceItem.id
                    })
                    .eq('id', schedule.id)

                if (updateError) {
                    console.error(`[Invoice Scheduler] DB Update Failed for ${schedule.id}`, updateError)
                } else {
                    processedCount++
                }

            } catch (stripeError: any) {
                console.error(`[Invoice Scheduler] Stripe Error for ${schedule.id}:`, stripeError.message)
            }
        }

        return NextResponse.json({ processed: processedCount, status: 'ok' })

    } catch (error: any) {
        console.error('[Invoice Scheduler] Fatal Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
