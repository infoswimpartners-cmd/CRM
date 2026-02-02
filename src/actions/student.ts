'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { stripe } from '@/lib/stripe'
import { emailService } from '@/lib/email'
import { formatStudentNames } from '@/lib/utils'

export async function updateStudent(id: string, formData: any) {
    const supabase = await createClient()

    // 1. Auth Check - Ensure Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // 2. Fetch current student data to compare membership
    const { data: currentStudent, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single()

    if (fetchError || !currentStudent) {
        return { success: false, error: 'Student not found' }
    }

    try {
        const updates: any = {
            full_name: formData.full_name,
            full_name_kana: formData.full_name_kana,
            gender: formData.gender,
            contact_email: formData.contact_email,
            contact_phone: formData.contact_phone,
            notes: formData.student_notes,
            status: formData.status,
            second_student_name: formData.second_student_name || null,
            second_student_name_kana: formData.second_student_name_kana || null,
            membership_type_id: formData.membership_type_id === 'unassigned' ? null : (formData.membership_type_id || null)
        }

        // Handle birth_date correctly (empty string -> null)
        if (formData.birth_date) {
            updates.birth_date = formData.birth_date
        } else {
            updates.birth_date = null
        }


        // --- AUTOMATION & STRIPE LOGIC ---
        let emailSent = false
        const oldMembership = currentStudent.membership_type_id
        const newMembership = updates.membership_type_id
        const startTiming = formData.start_timing // 'current' | 'next'

        if (newMembership && newMembership !== oldMembership) {
            console.log(`[UpdateStudent] Membership Changed: ${oldMembership} -> ${newMembership}`)
            updates.status = 'active'

            // 1. Get Plan Details (Price ID, Name, Fee)
            const { data: plan } = await supabase
                .from('membership_types')
                .select('name, stripe_price_id, fee')
                .eq('id', newMembership)
                .single()

            if (plan) {
                // 2. Ensure Stripe Customer ID
                let stripeCustomerId = currentStudent.stripe_customer_id

                // Verify if the customer actually exists in Stripe
                if (stripeCustomerId) {
                    try {
                        const existingCustomer = await stripe.customers.retrieve(stripeCustomerId)
                        if (existingCustomer.deleted) {
                            console.warn(`[UpdateStudent] Customer ${stripeCustomerId} is deleted in Stripe. Creating new one.`)
                            stripeCustomerId = null
                        }
                    } catch (e: any) {
                        // specific error code for customer not found is 'resource_missing'
                        if (e.code === 'resource_missing') {
                            console.warn(`[UpdateStudent] Customer ${stripeCustomerId} not found in Stripe. Creating new one.`)
                            stripeCustomerId = null
                        } else {
                            // If it's another error (e.g. API connection), we should probably let it fail or handle it.
                            // For now, rethrow to be safe, or we could assume checking failed and try to create?
                            // Safest is to rethrow if it's not a "not found" error.
                            throw e
                        }
                    }
                }

                if (!stripeCustomerId) {
                    // Create Stripe Customer if missing
                    const customer = await stripe.customers.create({
                        email: updates.contact_email || currentStudent.contact_email,
                        name: updates.full_name || currentStudent.full_name,
                        metadata: { supabaseWidthId: id }
                    })
                    stripeCustomerId = customer.id
                    updates.stripe_customer_id = stripeCustomerId
                    console.log(`[UpdateStudent] Created Stripe Customer: ${stripeCustomerId}`)
                }

                // Determine Start Date & Trial End
                // Rule:
                // - "Next Month": Trial End = 1st of next month. Billing starts then.
                // - "Current": Trial End = 1st of next month (to align cycle). BUT charge full amount NOW via invoice item.

                let startDateStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })

                const now = new Date()
                const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1) // 1st of next month
                const trialEndTimestamp = Math.floor(nextMonth.getTime() / 1000)

                if (startTiming === 'next') {
                    startDateStr = nextMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
                } else {
                    // startTiming === 'current'
                    // 1. Create Invoice Item for THIS month (Full Price)
                    if (plan.fee > 0) {
                        try {
                            const invoiceItemParams: any = {
                                customer: stripeCustomerId,
                                amount: plan.fee,
                                currency: 'jpy',
                                description: `初期費用（当月分会費）: ${plan.name}`
                            }
                            await stripe.invoiceItems.create(invoiceItemParams)
                            console.log(`[UpdateStudent] Created Invoice Item for current month: ${plan.fee} JPY`)
                        } catch (e: any) {
                            console.error('Invoice Item Error:', e)
                            return { success: false, error: '初期費用の請求作成に失敗しました: ' + e.message }
                        }
                    }
                }

                // 2.5. Ensure Default Payment Method prevents "No attached payment source" error
                try {
                    const paymentMethods = await stripe.paymentMethods.list({
                        customer: stripeCustomerId,
                        type: 'card',
                    })

                    if (paymentMethods.data.length > 0) {
                        const customerObj = await stripe.customers.retrieve(stripeCustomerId) as any
                        if (!customerObj.invoice_settings?.default_payment_method) {
                            await stripe.customers.update(stripeCustomerId, {
                                invoice_settings: { default_payment_method: paymentMethods.data[0].id }
                            })
                            console.log(`[UpdateStudent] Set default payment method to ${paymentMethods.data[0].id}`)
                        }
                    } else {
                        console.warn(`[UpdateStudent] No payment methods found for customer ${stripeCustomerId}`)
                    }
                } catch (pmError) {
                    console.error('[UpdateStudent] Failed to check/set payment method:', pmError)
                    // Continue anyway, it might fail at subscription creation if truly no method
                }

                // 3. Create Stripe Subscription
                if (plan.stripe_price_id) {
                    try {
                        // Cancel old subscription if exists
                        if (currentStudent.stripe_subscription_id) {
                            try {
                                await stripe.subscriptions.cancel(currentStudent.stripe_subscription_id)
                                console.log(`[UpdateStudent] Cancelled old subscription: ${currentStudent.stripe_subscription_id}`)
                            } catch (e) {
                                console.warn('Failed to cancel old subscription', e)
                            }
                        }

                        // Prepare subscription params
                        const subscriptionParams: any = {
                            customer: stripeCustomerId,
                            items: [{ price: plan.stripe_price_id }],
                            payment_behavior: 'default_incomplete',
                            expand: ['latest_invoice.payment_intent'],
                        }

                        // Always set trial_end to align cycle to 1st of next month
                        if (trialEndTimestamp) {
                            subscriptionParams.trial_end = trialEndTimestamp
                        }

                        const subscription = await stripe.subscriptions.create(subscriptionParams)
                        updates.stripe_subscription_id = subscription.id
                        console.log(`[UpdateStudent] Created new subscription: ${subscription.id} (Start: ${startTiming})`)

                    } catch (stripeError: any) {
                        console.error('Stripe Subscription Error:', stripeError)
                        return { success: false, error: 'Stripeサブスクリプション作成に失敗しました: ' + stripeError.message }
                    }
                }

                // 4. Send Email
                if (updates.contact_email) {
                    emailSent = await emailService.sendTemplateEmail(
                        'enrollment_complete',
                        updates.contact_email,
                        {
                            name: formatStudentNames({ full_name: updates.full_name, second_student_name: updates.second_student_name }),
                            plan_name: plan.name,
                            start_date: startDateStr
                        }
                    )
                }
            }
        }

        // 3. Update DB
        const { error: updateError } = await supabase
            .from('students')
            .update(updates)
            .eq('id', id)

        if (updateError) throw updateError

        revalidatePath(`/customers/${id}`)
        return { success: true, emailSent }

    } catch (error: any) {
        console.error('Update Student Error:', error)
        return { success: false, error: error.message || 'Failed to update student' }
    }
}

export async function updateStudentStatus(studentId: string, newStatus: string) {
    const supabase = await createClient()

    // 1. Auth Check - Ensure AdmiN
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        // 2. Fetch current student data (need stripe_sub_id)
        const { data: student, error: fetchError } = await supabase
            .from('students')
            .select('stripe_subscription_id')
            .eq('id', studentId)
            .single()

        if (fetchError || !student) {
            throw new Error('Student not found')
        }

        // 3. Handle "Withdrawn" logic (Cancel Subscription)
        if (newStatus === 'withdrawn') {
            if (student.stripe_subscription_id) {
                try {
                    await stripe.subscriptions.cancel(student.stripe_subscription_id)
                } catch (e: any) {
                    console.error('Stripe Cancel Error:', e)
                }
            }
        }

        const updatePayload: any = { status: newStatus }

        if (newStatus === 'withdrawn') {
            updatePayload.stripe_subscription_id = null
            updatePayload.membership_type_id = null
        }

        const { error: updateError } = await supabase
            .from('students')
            .update(updatePayload)
            .eq('id', studentId)

        if (updateError) throw updateError

        revalidatePath(`/customers/${studentId}`)
        return { success: true }

    } catch (error: any) {
        console.error('Update Status Error:', error)
        return { success: false, error: error.message || 'Failed to update status' }
    }
}
