import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ lessonId: string }> }
) {
    const params = await props.params
    const lessonId = params.lessonId
    const supabaseAdmin = createAdminClient()

    try {
        console.log(`[Trial Payment] Generating dynamic session for lesson: ${lessonId}`)
        // Fetch schedule detail (instead of lesson)
        const { data: schedule, error: scheduleError } = await supabaseAdmin
            .from('lesson_schedules')
            .select(`
                *,
                students (
                    id,
                    contact_email,
                    full_name,
                    stripe_customer_id,
                    status
                ),
                lesson_masters (
                    id,
                    name,
                    unit_price,
                    is_trial
                )
            `)
            .eq('id', lessonId)
            .single()

        if (scheduleError || !schedule) {
            console.error('[Trial Payment] Schedule not found:', lessonId, scheduleError)
            return new NextResponse('Schedule not found', { status: 404 })
        }

        const student = Array.isArray(schedule.students) ? schedule.students[0] : schedule.students;
        const lessonMaster = Array.isArray(schedule.lesson_masters) ? schedule.lesson_masters[0] : schedule.lesson_masters;

        let stripeCustomerId = student?.stripe_customer_id
        if (!stripeCustomerId) {
            console.error('[Trial Payment] Student has no Stripe Customer ID.')
            return new NextResponse('Stripe Customer ID not found', { status: 400 })
        }

        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'jpy',
                    product_data: {
                        name: lessonMaster?.name || '体験レッスン',
                    },
                    unit_amount: schedule.price || lessonMaster?.unit_price || 0,
                },
                quantity: 1,
            }],
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
            metadata: {
                studentId: student.id,
                scheduleId: schedule.id,
                type: 'trial_fee',
                lessonDate: schedule.start_time,
                location: schedule.location || '未定'
            },
            payment_intent_data: {
                setup_future_usage: 'off_session',
            }
        })

        if (!session.url) {
            console.error('[Trial Payment] Failed to create Stripe session URL')
            return new NextResponse('Failed to create session URL', { status: 500 })
        }

        return NextResponse.redirect(session.url)
    } catch (error) {
        console.error('[Trial Payment Error]', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
