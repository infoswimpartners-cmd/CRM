
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { emailService } from '@/lib/email'
import { revalidatePath } from 'next/cache'

export async function confirmTrialAndBill(studentId: string, lessonDate: Date, coachId: string, location: string = '未定', trialMasterId?: string, customEmail?: { subject: string, body: string }) {
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
        let trialMaster: any = null
        if (trialMasterId) {
            const { data, error: masterError } = await supabaseAdmin.from('lesson_masters').select('*').eq('id', trialMasterId).single()
            if (masterError || !data) throw new Error('Trial Lesson Master not found')
            trialMaster = data
        } else {
            const { data, error: masterError } = await supabaseAdmin.from('lesson_masters').select('*').eq('is_trial', true).single()
            if (masterError || !data) throw new Error('Trial Lesson Master not found')
            trialMaster = data
        }

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

        // カスタムメール本文がある場合は、プレースホルダーを実際のURLに置換する（ユーザーが削除した場合は末尾に自動追加）
        if (customEmail) {
            if (customEmail.body.includes('【実際の決済URLがここに挿入されます】')) {
                customEmail.body = customEmail.body.replace('【実際の決済URLがここに挿入されます】', session.url || '')
            } else {
                customEmail.body += `\n\n【決済リンク】\n${session.url || ''}`
            }
        }

        const endDateTime = new Date(lessonDate)
        endDateTime.setMinutes(endDateTime.getMinutes() + 60)
        const lessonDateStr = `${lessonDate.toLocaleDateString('ja-JP')} ${lessonDate.getHours().toString().padStart(2, '0')}:${lessonDate.getMinutes().toString().padStart(2, '0')}〜${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`

        const emailSent = await emailService.sendTriggerEmail('trial_lesson_reserved', student.contact_email, {
            name: student.full_name,
            lesson_date: lessonDateStr,
            amount: trialMaster.unit_price.toLocaleString(),
            payment_link: session.url || ''
        }, customEmail)

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

        // [MODIFIED] Google Calendar Sync
        try {
            const { createCalendarEvent, getAdminRefreshToken } = await import('@/lib/google-calendar')
            const adminRefreshToken = await getAdminRefreshToken(supabaseAdmin)

            if (adminRefreshToken) {
                const { data: newSchedule } = await supabaseAdmin
                    .from('lesson_schedules')
                    .select('id')
                    .eq('student_id', studentId)
                    .eq('start_time', startTime.toISOString())
                    .single()

                if (newSchedule) {
                    const eventId = await createCalendarEvent(adminRefreshToken, {
                        summary: `${student.full_name}様 体験レッスン`,
                        description: `体験レッスン予約確定\n場所: ${location}`,
                        location: location,
                        start: startTime.toISOString(),
                        end: endTime.toISOString()
                    })

                    if (eventId) {
                        await supabaseAdmin
                            .from('lesson_schedules')
                            .update({ google_event_id: eventId })
                            .eq('id', newSchedule.id)
                        console.log('[Trial Confirm] Google Calendar Sync Success:', eventId)
                    }
                }
            }
        } catch (calErr) {
            console.error('[Trial Confirm] Google Calendar Sync Failed:', calErr)
        }

        // 8. Update Status -> trial_billed
        await supabaseAdmin
            .from('students')
            .update({ status: 'trial_billed' })
            .eq('id', studentId)

        console.log('[Trial Confirm] Status updated to trial_billed')

        revalidatePath(`/customers/${studentId}`)
        return { success: true }

    } catch (error: any) {
        console.error('[Trial Confirm Error]', error)
        return { success: false, error: error.message }
    }
}

export async function getTrialEmailPreview(studentId: string, lessonDate: Date, trialMasterId?: string) {
    const supabaseAdmin = createAdminClient()

    try {
        const { data: student } = await supabaseAdmin.from('students').select('*').eq('id', studentId).single()
        if (!student) throw new Error('Student not found')

        let trialMaster: any = null
        if (trialMasterId) {
            const { data } = await supabaseAdmin.from('lesson_masters').select('*').eq('id', trialMasterId).single()
            trialMaster = data
        } else {
            const { data } = await supabaseAdmin.from('lesson_masters').select('*').eq('is_trial', true).single()
            trialMaster = data
        }

        const endDateTime = new Date(lessonDate)
        endDateTime.setMinutes(endDateTime.getMinutes() + 60)
        const lessonDateStr = `${lessonDate.toLocaleDateString('ja-JP')} ${lessonDate.getHours().toString().padStart(2, '0')}:${lessonDate.getMinutes().toString().padStart(2, '0')}〜${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`

        const variables = {
            name: student.full_name,
            lesson_date: lessonDateStr,
            amount: (trialMaster?.unit_price || 0).toLocaleString(),
            payment_link: '【実際の決済URLがここに挿入されます】'
        }

        let template_id = null

        if (trialMaster?.email_template_id) {
            template_id = trialMaster.email_template_id
        } else {
            const { data: trigger } = await supabaseAdmin.from('email_triggers').select('template_id').eq('id', 'trial_lesson_reserved').single()
            template_id = trigger?.template_id
        }

        if (!template_id) throw new Error('Template not found')

        const { data: template } = await supabaseAdmin.from('email_templates').select('subject, body').eq('id', template_id).single()
        if (!template) throw new Error('Template not found')

        let renderedSubject = template.subject
        let renderedBody = template.body

        for (const [k, v] of Object.entries(variables)) {
            const regex = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g')
            renderedSubject = renderedSubject.replace(regex, v)
            renderedBody = renderedBody.replace(regex, v)
        }

        return { success: true, subject: renderedSubject, body: renderedBody }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
