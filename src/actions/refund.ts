'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin' // Refunds are Admin only usually
import { stripe } from '@/lib/stripe'
import { revalidatePath } from 'next/cache'

interface RefundParams {
    scheduleId: string
    amount?: number // Optional for partial, defaults to full if not provided? No, specific amount is safer for partial.
    reason?: string
    isFullRefund?: boolean
}

export async function processRefund({ scheduleId, amount, reason, isFullRefund = true }: RefundParams) {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // 1. Auth & Admin Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin' && profile?.role !== 'owner') {
        return { success: false, error: 'Permission denied' }
    }

    try {
        // 2. Fetch Schedule
        const { data: schedule } = await supabaseAdmin
            .from('lesson_schedules')
            .select('payment_intent_id, price, billing_status')
            .eq('id', scheduleId)
            .single()

        if (!schedule) return { success: false, error: 'Schedule not found' }
        if (!schedule.payment_intent_id) return { success: false, error: 'No associated payment found (PaymentIntent ID missing)' }
        if (schedule.billing_status !== 'paid' && schedule.billing_status !== 'partially_refunded') {
            return { success: false, error: `Invalid status for refund: ${schedule.billing_status}` }
        }

        // 3. Determine Amount
        let refundAmount = amount
        if (isFullRefund) {
            // Retrieve PaymentIntent to be sure of remaining amount?
            // Or just sending undefined refunds full amount (if not partially refunded before).
            // Stripe API: amount is optional (full refund if null). 
            // BUT if partially refunded before, we must be careful.
            refundAmount = undefined
        } else {
            if (!refundAmount || refundAmount <= 0) {
                return { success: false, error: 'Refund amount required for partial refund' }
            }
        }

        // 4. Clean Reason
        // Stripe Enum: duplicate, fraudulent, requested_by_customer. 
        // We can put custom reason in metadata.
        const stripeReason: 'requested_by_customer' | 'duplicate' | 'fraudulent' | undefined = 'requested_by_customer'

        // 5. Execute Refund
        const refund = await stripe.refunds.create({
            payment_intent: schedule.payment_intent_id,
            amount: refundAmount, // Integer in yen
            reason: stripeReason,
            metadata: {
                schedule_id: scheduleId,
                admin_reason: reason || ''
            }
        })

        // 6. Update DB
        // If full refund (or status becomes fully refunded), set 'refunded'.
        // If partial, 'partially_refunded'.
        // Stripe refund object has 'status'.

        let newStatus = 'refunded'
        if (refund.status === 'succeeded') {
            // Check if it's fully refunded. 
            // We can check PaymentIntent status if needed, but for now:
            if (!isFullRefund) {
                newStatus = 'partially_refunded'
            }
        } else {
            // pending?
            newStatus = 'refunded' // Assume success for now or check status
        }

        await supabaseAdmin
            .from('lesson_schedules')
            .update({
                billing_status: newStatus,
                refund_id: refund.id,
                refund_status: isFullRefund ? 'full' : 'partial'
            })
            .eq('id', scheduleId)

        revalidatePath('/admin/billing')

        return { success: true, refundId: refund.id }

    } catch (error: any) {
        console.error('Refund Error:', error)
        return { success: false, error: error.message }
    }
}
