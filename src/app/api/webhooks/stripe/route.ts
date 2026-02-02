import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailService } from '@/lib/email'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature') as string

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('Missing STRIPE_WEBHOOK_SECRET')
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            secret
        )
    } catch (err: any) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`)
        return NextResponse.json({ error: 'Webhook Error' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                const { studentId, type, lessonDate, location } = session.metadata || {}

                if (type === 'trial_fee' && studentId) {
                    console.log(`[Stripe Webhook] Processing Trial Confirmation for Student: ${studentId}`)

                    // 1. Update Student Status
                    const { error: dbError } = await supabaseAdmin
                        .from('students')
                        .update({ status: 'trial_confirmed' })
                        .eq('id', studentId)

                    if (dbError) {
                        console.error('[Stripe Webhook] DB Update Failed:', dbError)
                        throw dbError
                    }
                    console.log(`[Stripe Webhook] Student ${studentId} status updated to trial_confirmed`)

                    // 2. Fetch Student Info for Email
                    const { data: student, error: fetchError } = await supabaseAdmin
                        .from('students')
                        .select('contact_email, full_name')
                        .eq('id', studentId)
                        .single()

                    if (student && !fetchError) {
                        const formattedDate = lessonDate
                            ? new Date(lessonDate).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
                            : '未定'
                        const lessonLocation = location || '未定'

                        // 3. Send Customer Email
                        const studentEmailSent = await emailService.sendTemplateEmail(
                            'trial_payment_completed',
                            student.contact_email,
                            {
                                full_name: student.full_name,
                                lesson_date: formattedDate,
                                location: lessonLocation
                            }
                        )
                        if (studentEmailSent) {
                            console.log(`[Stripe Webhook] Trial confirmation email sent to ${student.contact_email}`)
                        } else {
                            console.error(`[Stripe Webhook] Failed to send email to ${student.contact_email}`)
                        }

                        // 4. Send Admin Notification
                        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'info@swim-partners.com'
                        const adminEmailSent = await emailService.sendEmail({
                            to: adminEmail,
                            subject: '【管理者通知】体験レッスンの決済が完了しました',
                            text: `以下の生徒の体験レッスン料の決済が完了しました。\n\n氏名: ${student.full_name}\n日時: ${formattedDate}\n場所: ${lessonLocation}\nステータス: 体験確定\n\n管理画面で確認してください。`
                        })
                        if (adminEmailSent) {
                            console.log(`[Stripe Webhook] Admin notification sent to ${adminEmail}`)
                        }
                    } else {
                        console.error('[Stripe Webhook] Failed to fetch student info for email')
                    }
                }
                break
            }
            case 'invoice.paid': {
                const invoice = event.data.object as Stripe.Invoice
                const scheduleId = invoice.metadata?.schedule_id

                if (scheduleId) {
                    console.log(`[Stripe Webhook] Invoice paid for schedule: ${scheduleId}`)
                    await supabaseAdmin
                        .from('lesson_schedules')
                        .update({
                            billing_status: 'paid',
                            payment_intent_id: typeof (invoice as any).payment_intent === 'string' ? (invoice as any).payment_intent : (invoice as any).payment_intent?.id
                        })
                        .eq('id', scheduleId)
                }
                break
            }
            case 'charge.refunded': {
                const charge = event.data.object as Stripe.Charge
                const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id

                if (paymentIntentId) {
                    const { data: schedule } = await supabaseAdmin
                        .from('lesson_schedules')
                        .select('id')
                        .eq('payment_intent_id', paymentIntentId)
                        .single()

                    if (schedule) {
                        const isFull = charge.refunded // Boolean on charge object
                        // or check amount_refunded

                        await supabaseAdmin
                            .from('lesson_schedules')
                            .update({
                                billing_status: charge.refunded ? 'refunded' : 'partially_refunded',
                                refund_status: charge.refunded ? 'full' : 'partial'
                                // if partially refunded, status might just be partially_refunded?
                                // charge.refunded is true if fully refunded? No, it means "has been refunded".
                                // We should check amount_refunded vs amount.
                            })
                            .eq('id', schedule.id)

                        // Refined Logic:
                        const isFullyRefunded = charge.amount_refunded >= charge.amount
                        await supabaseAdmin
                            .from('lesson_schedules')
                            .update({
                                billing_status: isFullyRefunded ? 'refunded' : 'partially_refunded',
                                refund_status: isFullyRefunded ? 'full' : 'partial'
                            })
                            .eq('id', schedule.id)

                        console.log(`[Stripe Webhook] Refund processed for schedule ${schedule.id}. Status: ${isFullyRefunded ? 'refunded' : 'partially_refunded'}`)
                    }
                }
                break
            }
            default:
            // Unhandled event type
        }
    } catch (error) {
        console.error('[Stripe Webhook] Processing Error:', error)
        return NextResponse.json({ error: 'Webhook Processing Error' }, { status: 500 })
    }

    return NextResponse.json({ received: true })
}
