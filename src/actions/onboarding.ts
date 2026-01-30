
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { emailService } from '@/lib/email'
import { revalidatePath } from 'next/cache'

export async function confirmTrialAndBill(studentId: string, lessonDate: Date, coachId: string, location: string = '未定') {
    const supabaseAdmin = createAdminClient()

    try {
        console.log(`[Trial Confirm] Starting for Student: ${studentId}`)

        // 1. Fetch Student
        const { data: student, error: fetchError } = await supabaseAdmin
            .from('students')
            .select('*')
            .eq('id', studentId)
            .single()

        if (fetchError || !student) throw new Error('Student not found')

        // 2. Schedule Lesson (Trial)
        // Fetch 'Trial' Lesson Master
        const { data: trialMaster, error: masterError } = await supabaseAdmin
            .from('lesson_masters')
            .select('*')
            .eq('is_trial', true)
            .single()

        if (masterError || !trialMaster) throw new Error('Trial Lesson Master not found')

        const { error: lessonError } = await supabaseAdmin
            .from('lessons')
            .insert({
                student_id: studentId,
                coach_id: coachId, // Assigned Coach
                student_name: student.full_name, // Required by Schema
                lesson_date: lessonDate.toISOString(),
                location: location, // Use provided location
                lesson_master_id: trialMaster.id,
                price: trialMaster.unit_price,
                billing_price: trialMaster.unit_price
            })

        if (lessonError) throw new Error(`Lesson Creation Failed: ${lessonError.message}`)

        // 3. Update Student Coach in Profile (Optional but good practice to sync)
        await supabaseAdmin
            .from('students')
            .update({ coach_id: coachId })
            .eq('id', studentId)

        // 4. Create Stripe Customer (if needed)
        let stripeCustomerId = student.stripe_customer_id
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: student.contact_email,
                name: student.full_name,
                metadata: { studentId: student.id }
            })
            stripeCustomerId = customer.id

            await supabaseAdmin
                .from('students')
                .update({ stripe_customer_id: stripeCustomerId })
                .eq('id', studentId)
        }

        // 5. Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'jpy',
                    product_data: {
                        name: trialMaster.name || '体験レッスン',
                    },
                    unit_amount: trialMaster.unit_price,
                },
                quantity: 1,
            }],
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
            metadata: {
                studentId: studentId,
                type: 'trial_fee',
                lessonDate: lessonDate.toISOString(),
                location: location
            },
            payment_intent_data: {
                setup_future_usage: 'off_session',
            }
        })

        if (!student.contact_email) {
            throw new Error('学生の連絡先メールアドレスが設定されていません。')
        }

        // 6. Send Email (Template)
        console.log(`[Trial Confirm] Sending email to ${student.contact_email}...`)
        const emailSent = await emailService.sendTemplateEmail('trial_payment_request', student.contact_email, {
            name: student.full_name,
            lesson_date: lessonDate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
            amount: trialMaster.unit_price.toLocaleString(),
            payment_link: session.url || ''
        })

        if (!emailSent) {
            console.error('[Trial Confirm] Email FAILED to send.')
            throw new Error('メール送信に失敗しました。メールアドレスを確認してください。')
        }

        console.log('[Trial Confirm] Email SENT successfully.')

        // 7. Create Schedule (Calendar)
        // Default duration: 60 mins
        const startTime = new Date(lessonDate)
        const endTime = new Date(lessonDate)
        endTime.setHours(endTime.getHours() + 1)

        const { error: scheduleError } = await supabaseAdmin
            .from('lesson_schedules')
            .insert({
                coach_id: coachId,
                student_id: studentId,
                title: `${student.full_name}様 体験レッスン`,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                location: location, // Use provided location
                notes: '体験レッスン自動登録'
            })

        if (scheduleError) {
            console.error('[Trial Confirm] Schedule Creation Failed:', scheduleError)
            throw new Error(`Schedule creation failed: ${scheduleError.message}`)
        }

        // 8. Update Status -> trial_confirmed
        // DEPRECATED: Status update moved to Stripe Webhook (after payment)
        // await supabaseAdmin
        //     .from('students')
        //     .update({ status: 'trial_confirmed' })
        //     .eq('id', studentId)

        console.log('[Trial Confirm] Status update skipped (waiting for payment)')

        revalidatePath(`/customers/${studentId}`)
        return { success: true }

    } catch (error: any) {
        console.error('[Trial Confirm Error]', error)
        return { success: false, error: error.message }
    }
}
