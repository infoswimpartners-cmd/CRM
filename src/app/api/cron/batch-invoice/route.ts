
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * Monthly Batch Invoicing for Single Members (Non-Subscribers)
 * 
 * Logic:
 * 1. Find all lesson schedules with 'ready_to_invoice' status.
 * 2. Group them by student.
 * 3. Filter out students who have an active Stripe Subscription (Stripe handles them automatically).
 * 4. For the remaining students (Single Members), create a one-off Stripe Invoice.
 * 5. Finalize the invoice to trigger payment/email.
 */
export async function GET(req: NextRequest) {
    // Basic Auth Check
    const authHeader = req.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const log: string[] = []
    log.push(`[BatchInvoice] Starting batch invoicing at ${new Date().toISOString()}`)

    try {
        // 1. Fetch all 'ready_to_invoice' schedules with student details
        const { data: schedules, error } = await supabase
            .from('lesson_schedules')
            .select(`
                id,
                student_id,
                billing_status,
                stripe_invoice_item_id,
                student:students (
                    id,
                    full_name,
                    stripe_customer_id,
                    stripe_subscription_id
                )
            `)
            .eq('billing_status', 'ready_to_invoice')

        if (error) throw error

        if (!schedules || schedules.length === 0) {
            log.push('No schedules waiting for invoice.')
            return NextResponse.json({ success: true, log })
        }

        // 2. Group by student and filter for non-subscribers
        const studentsToInvoice = new Map<string, any>()
        
        for (const s of schedules) {
            const student = s.student as any
            if (!student || !student.stripe_customer_id) continue
            
            // Skip if they have a subscription (Stripe's subscription renewal will pick up pending items)
            if (student.stripe_subscription_id) {
                // Double check if subscription is actually active in Stripe (optional but safer)
                // For now, assume if the ID is present and not explicitly cancelled in DB, it's active.
                continue
            }

            if (!studentsToInvoice.has(student.id)) {
                studentsToInvoice.set(student.id, {
                    student,
                    schedules: []
                })
            }
            studentsToInvoice.get(student.id).schedules.push(s)
        }

        log.push(`Found ${studentsToInvoice.size} students (non-subscribers) to invoice.`)

        // 3. Process each student
        for (const [studentId, info] of studentsToInvoice.entries()) {
            const { student, schedules: studentSchedules } = info
            const customerId = student.stripe_customer_id

            try {
                log.push(`Invoicing ${student.full_name} (${studentId})...`)

                // A. Check if there are actually pending items in Stripe for this customer
                // (Just to be safe before creating an invoice)
                const pendingItems = await stripe.invoiceItems.list({
                    customer: customerId,
                    pending: true,
                    limit: 10
                })

                if (pendingItems.data.length === 0) {
                    log.push(`  - No pending invoice items found in Stripe for ${student.full_name}. Skipping.`)
                    continue
                }

                // B. Create Invoice
                // This automatically pulls all pending invoice items for this customer.
                const invoice = await stripe.invoices.create({
                    customer: customerId,
                    auto_advance: true,
                    collection_method: 'charge_automatically', // Try to charge card
                    description: `${new Date().getMonth() + 1}月分 レッスン料まとめ請求`
                })

                log.push(`  - Created Invoice: ${invoice.id}`)

                // C. Finalize (and pay if possible)
                let finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)
                
                try {
                    // Attempt payment if card is registered
                    finalizedInvoice = await stripe.invoices.pay(finalizedInvoice.id)
                    log.push(`  - Payment Status: ${finalizedInvoice.status}`)
                } catch (payErr: any) {
                    log.push(`  - Payment failed or requires manual action: ${payErr.message}`)
                }

                // D. Update DB for these schedules
                const scheduleIds = studentSchedules.map((s: any) => s.id)
                const isPaid = finalizedInvoice.status === 'paid'
                const newStatus = isPaid ? 'paid' : 'awaiting_payment'

                const { error: updateError } = await supabase
                    .from('lesson_schedules')
                    .update({
                        billing_status: newStatus,
                        payment_intent_id: typeof (finalizedInvoice as any).payment_intent === 'string' 
                            ? (finalizedInvoice as any).payment_intent 
                            : (finalizedInvoice as any).payment_intent?.id || null
                    })
                    .in('id', scheduleIds)

                if (updateError) throw updateError
                log.push(`  - Updated ${scheduleIds.length} schedules in DB.`)

            } catch (err: any) {
                log.push(`  - Error processing student ${student.full_name}: ${err.message}`)
                console.error(`[BatchInvoice] Student ${studentId} failed:`, err)
            }
        }

        log.push(`Batch invoicing completed at ${new Date().toISOString()}`)
        return NextResponse.json({ success: true, log })

    } catch (error: any) {
        log.push(`Fatal Error: ${error.message}`)
        console.error('[BatchInvoice] Fatal Error:', error)
        return NextResponse.json({ success: false, error: error.message, log }, { status: 500 })
    }
}
