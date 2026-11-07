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

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://manager.swim-partners.com'

        // 二重請求防止: 既に決済が完了している場合は決済セッションを作成せず完了ページへ案内
        if (schedule.billing_status === 'paid') {
            console.log(`[Trial Payment] Schedule ${lessonId} is already paid. Redirecting to success.`)
            return NextResponse.redirect(`${appUrl}/success?already_paid=true`)
        }

        let stripeCustomerId = student?.stripe_customer_id
        if (!stripeCustomerId && student?.id) {
            console.log(`[Trial Payment] Resolving Stripe customer for student: ${student.id}`)
            try {
                const targetEmail = (student.contact_email || '').trim()
                if (targetEmail) {
                    const existingCustomers = await stripe.customers.list({ email: targetEmail, limit: 1 })
                    if (existingCustomers.data && existingCustomers.data.length > 0) {
                        stripeCustomerId = existingCustomers.data[0].id
                    }
                }

                if (!stripeCustomerId) {
                    const customer = await stripe.customers.create({
                        email: targetEmail || undefined,
                        name: student.full_name || undefined,
                        metadata: { studentId: student.id }
                    })
                    stripeCustomerId = customer.id
                }

                // Update student with new Stripe Customer ID
                await supabaseAdmin
                    .from('students')
                    .update({ stripe_customer_id: stripeCustomerId })
                    .eq('id', student.id)
            } catch (stripeErr) {
                console.error('[Trial Payment] Failed to resolve Stripe customer:', stripeErr)
                return new NextResponse('Failed to create customer in Stripe', { status: 500 })
            }
        }

        if (!stripeCustomerId) {
            console.error('[Trial Payment] Student has no Stripe Customer ID.')
            return new NextResponse('Stripe Customer ID not found', { status: 400 })
        }

        // 案件IDの抽出と関連スケジュール（1人目・2人目など）の検索
        let targetSchedules = [schedule]
        const leadMatch = schedule.notes?.match(/案件ID:\s*([a-zA-Z0-9\-]+)/)
        if (leadMatch) {
            const leadId = leadMatch[1]
            const { data: related } = await supabaseAdmin
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
                .ilike('notes', `%案件ID: ${leadId}%`)
                .order('start_time', { ascending: true })

            if (related && related.length > 0) {
                targetSchedules = related
            }
        }

        const line_items = targetSchedules.map((s) => {
            const m = Array.isArray(s.lesson_masters) ? s.lesson_masters[0] : s.lesson_masters
            let itemName = m?.name || '体験レッスン'
            if (s.title) {
                const namePart = s.title.split('様')[0]
                if (namePart) {
                    itemName = `体験レッスン（${namePart.trim()} 様）`
                }
            }
            return {
                price_data: {
                    currency: 'jpy',
                    product_data: {
                        name: itemName,
                    },
                    unit_amount: s.price || m?.unit_price || 0,
                },
                quantity: 1,
            }
        })

        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: line_items,
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
            metadata: {
                studentId: student.id,
                scheduleId: schedule.id,
                relatedScheduleIds: JSON.stringify(targetSchedules.map(s => s.id)),
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
