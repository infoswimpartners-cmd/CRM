'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { emailService } from '@/lib/email'
import { format } from 'date-fns'
import { revalidatePath } from 'next/cache'

/**
 * Processes the billing for a given lesson schedule.
 * Creates Invoice Item, Invoice, Finalizes it, Updates DB, and Sends Email.
 */
export async function processLessonBilling(scheduleId: string) {
    const supabaseAdmin = createAdminClient()

    try {
        console.log('[Billing] Starting processing for:', scheduleId)

        // 1. Fetch Schedule & Student Details
        // 1. Fetch Schedule (Raw) - Split query to avoid join issues
        const { data: scheduleRaw, error: scheduleError } = await supabaseAdmin
            .from('lesson_schedules')
            .select('*')
            .eq('id', scheduleId)
            .single()

        if (scheduleError || !scheduleRaw) {
            console.error('[Billing] Schedule fetch error:', scheduleError)
            return { success: false, error: 'Schedule not found (Billing)' }
        }

        // 2. Fetch Student
        const { data: student, error: studentError } = await supabaseAdmin
            .from('students')
            .select('id, stripe_customer_id, contact_email, full_name, second_student_name')
            .eq('id', scheduleRaw.student_id)
            .single()

        if (studentError || !student) {
            console.error('[Billing] Student fetch error:', studentError)
            return { success: false, error: 'Student not found (Billing)' }
        }

        if (!student.stripe_customer_id) {
            console.error('[Billing] Missing Stripe Customer ID for student:', student.id)
            return { success: false, error: 'Stripe Customer ID not found' }
        }

        // Combine
        const data = {
            ...scheduleRaw,
            student
        }
        // const data = schedule as any // No longer needed
        // const student is already distinct

        const price = data.price || 0
        if (price <= 0) {
            console.warn('[Billing] Price is 0 or missing. Cannot bill via Stripe.')
            return { success: false, error: '請求額が0円のため請求を作成できません' }
        }

        // 2. Stripe Billing
        let stripeCustomerId = student.stripe_customer_id

        // [MODIFIED] Auto-create Stripe Customer if missing (e.g., Trial Users)
        if (!stripeCustomerId) {
            console.log('[Billing] Stripe Customer ID missing. Creating new customer...')
            try {
                const customer = await stripe.customers.create({
                    email: student.contact_email,
                    name: student.full_name,
                    metadata: { studentId: student.id }
                })
                stripeCustomerId = customer.id

                // Update DB
                await supabaseAdmin
                    .from('students')
                    .update({ stripe_customer_id: stripeCustomerId })
                    .eq('id', student.id)

                console.log('[Billing] Created Stripe Customer:', stripeCustomerId)
            } catch (err: any) {
                console.error('[Billing] Failed to create Stripe Customer:', err)
                return { success: false, error: 'Stripe Customer Creation Failed' }
            }
        }

        const itemDescription = `追加レッスン料 (${format(new Date(data.start_time), 'yyyy/MM/dd')}): ${data.title}`

        // A. Invoice Item
        const invoiceItem = await stripe.invoiceItems.create({
            customer: stripeCustomerId,
            amount: price,
            currency: 'jpy',
            description: itemDescription,
            metadata: {
                schedule_id: data.id
            }
        })
        console.log('[Billing] Invoice Item created:', invoiceItem.id)

        // B. Create Invoice
        const invoice = await stripe.invoices.create({
            customer: stripeCustomerId,
            collection_method: 'send_invoice',
            days_until_due: 1,
            auto_advance: true,
            metadata: {
                schedule_id: data.id
            }
        })
        console.log('[Billing] Invoice created:', invoice.id)

        // C. Finalize Invoice
        const finalized = await stripe.invoices.finalizeInvoice(invoice.id)
        console.log('[Billing] Invoice finalized. Status:', finalized.status)

        const paymentUrl = finalized.hosted_invoice_url
        const paymentIntentId = typeof (finalized as any).payment_intent === 'string'
            ? (finalized as any).payment_intent
            : ((finalized as any).payment_intent as any)?.id // Safe access

        // 3. Update Schedule
        // Status becomes 'awaiting_payment'
        const { error: updateError } = await supabaseAdmin
            .from('lesson_schedules')
            .update({
                billing_status: 'awaiting_payment',
                stripe_invoice_item_id: invoiceItem.id,
                payment_intent_id: paymentIntentId ?? null,
                notification_sent_at: new Date().toISOString() // Track when we sent it
            })
            .eq('id', scheduleId)

        if (updateError) {
            console.error('[Billing] Update DB error:', updateError)
            throw new Error(`DB Update Failed: ${updateError.message}`)
        }

        // 4. Send Email
        if (student.contact_email && paymentUrl) {
            console.log('[Billing] Sending email to:', student.contact_email)

            const lessonDate = new Date(data.start_time)

            // [MODIFIED] Check if Trial Lesson (is_overage + title check or just title?)
            // Or better: Check if student status is trial_pending? 
            // We don't have student status here, but usually trial lessons have "体験" in title.
            // Let's rely on Title or Overage + No Membership?
            // Safer: Check Title for "体験"
            const isTrial = data.title && data.title.includes('体験')

            if (isTrial) {
                console.log('[Billing] Detected Trial Lesson. Sending trial_payment_request.')
                await emailService.sendTemplateEmail(
                    'trial_payment_request',
                    student.contact_email,
                    {
                        name: student.full_name,
                        lesson_date: format(lessonDate, 'yyyy/MM/dd HH:mm'), // Template expects string? Previous code was localString
                        amount: price.toLocaleString(),
                        payment_link: paymentUrl
                    }
                )
            } else {
                // Regular Overage
                // Helper to format names
                const formatStudentNames = (s: any) => {
                    if (s.second_student_name) return `${s.full_name}・${s.second_student_name}`
                    return s.full_name
                }

                await emailService.sendTemplateEmail(
                    'immediate_payment_request',
                    student.contact_email,
                    {
                        student_name: formatStudentNames(student),
                        date: format(lessonDate, 'yyyy/MM/dd'),
                        time: format(lessonDate, 'HH:mm'),
                        title: data.title,
                        amount: price.toLocaleString() + '円',
                        payment_url: paymentUrl
                    }
                )
            }
        } else {
            console.log('[Billing] Skipping email. Email:', student.contact_email, 'URL:', !!paymentUrl)
        }

        return { success: true }

    } catch (error: any) {
        console.error('[Billing] Process Error:', error)
        return { success: false, error: error.message }
    }
}
