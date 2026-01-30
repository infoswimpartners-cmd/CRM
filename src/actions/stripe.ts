'use server'

import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { revalidatePath } from 'next/cache'

export async function createStripeCustomer(studentId: string) {
    const supabase = await createClient()

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Fetch Student
    const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single()

    if (!student) return { success: false, error: 'Student not found' }
    if (student.stripe_customer_id) return { success: false, error: 'Already registered' }

    try {
        const customer = await stripe.customers.create({
            name: `${student.last_name} ${student.first_name}`,
            email: student.contact_email || undefined,
            metadata: {
                studentId: student.id,
                studentNumber: student.student_number
            }
        })

        const { error } = await supabase
            .from('students')
            .update({ stripe_customer_id: customer.id })
            .eq('id', studentId)

        if (error) throw error

        revalidatePath(`/admin/students/${studentId}`)
        return { success: true, customerId: customer.id }
    } catch (error) {
        console.error('Stripe Create Customer Error:', error)
        return { success: false, error: 'Failed to create Stripe customer' }
    }
}

export async function createPaymentSetupLink(studentId: string) {
    const supabase = await createClient()

    // Fetch Student
    const { data: student } = await supabase
        .from('students')
        .select('stripe_customer_id')
        .eq('id', studentId)
        .single()

    if (!student?.stripe_customer_id) return { success: false, error: 'No Stripe Customer ID' }

    try {
        const session = await stripe.checkout.sessions.create({
            customer: student.stripe_customer_id,
            mode: 'setup',
            currency: 'jpy',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/customers/${studentId}?payment_setup=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/customers/${studentId}?payment_setup=cancel`,
            payment_method_types: ['card'],
        })

        return { success: true, url: session.url }
    } catch (error) {
        console.error('Stripe Setup Link Error:', error)
        return { success: false, error: 'Failed to create setup link' }
    }
}

export async function getStripeCustomerStatus(stripeCustomerId: string) {
    try {
        const customer = await stripe.customers.retrieve(stripeCustomerId, {
            expand: ['invoice_settings.default_payment_method']
        })

        if (customer.deleted) return { deleted: true }

        let paymentMethod = customer.invoice_settings.default_payment_method

        // If no default, check if any exists and set it
        if (!paymentMethod) {
            const paymentMethods = await stripe.paymentMethods.list({
                customer: stripeCustomerId,
                type: 'card',
                limit: 1,
            })

            if (paymentMethods.data.length > 0) {
                paymentMethod = paymentMethods.data[0]
                // Auto-set as default
                await stripe.customers.update(stripeCustomerId, {
                    invoice_settings: { default_payment_method: paymentMethod.id }
                })
            }
        }

        return {
            hasPaymentMethod: !!paymentMethod,
            paymentMethod: typeof paymentMethod === 'object' ? paymentMethod : null
        }
    } catch (error) {
        console.error('Stripe Get Status Error:', error)
        return null
    }
}

export async function assignMembership(studentId: string, membershipTypeId: string | null, isNextMonth: boolean = false) {
    const supabase = await createClient()

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // --- RESERVATION MODE ---
    if (isNextMonth) {
        // If membershipTypeId is provided, store it as reservation.
        // If null, we treat it as "Clear Reservation" (Cancel pending change)
        const updateData = { next_membership_type_id: membershipTypeId || null }

        const { error } = await supabase.from('students')
            .update(updateData)
            .eq('id', studentId)

        if (error) {
            console.error('Reservation Error:', error)
            return { success: false, error: '予約の保存に失敗しました' }
        }

        revalidatePath(`/customers/${studentId}`)
        return { success: true }
    }

    try {
        // 2. Fetch Student with subscription info
        const { data: student } = await supabase
            .from('students')
            .select('stripe_customer_id, stripe_subscription_id')
            .eq('id', studentId)
            .single()

        if (!student) return { success: false, error: 'Student not found' }

        // --- CASE: Unassign (Remove Membership) ---
        if (!membershipTypeId) {
            if (student.stripe_subscription_id) {
                try {
                    await stripe.subscriptions.cancel(student.stripe_subscription_id)
                } catch (e) {
                    console.error('Error cancelling subscription:', e)
                }
            }

            await supabase.from('students').update({
                membership_type_id: null,
                stripe_subscription_id: null,
                next_membership_type_id: null // Clear any reservation
            }).eq('id', studentId)

            revalidatePath(`/customers/${studentId}`)
            return { success: true }
        }

        // --- CASE: Assign/Change Membership ---
        if (!student.stripe_customer_id) {
            return { success: false, error: '支払い方法が登録されていません。先にカード登録を完了してください。' }
        }

        const { data: membership } = await supabase
            .from('membership_types')
            .select('stripe_price_id')
            .eq('id', membershipTypeId)
            .single()

        if (!membership?.stripe_price_id) {
            return { success: false, error: 'この会員種別はStripeと連携されていません（Price ID未設定）。' }
        }

        let subscriptionId = student.stripe_subscription_id

        if (subscriptionId) {
            // Update existing subscription
            try {
                const subscription = await stripe.subscriptions.retrieve(subscriptionId)
                if (subscription.status === 'canceled') {
                    throw new Error('Subscription canceled')
                }

                const itemId = subscription.items.data[0].id

                await stripe.subscriptions.update(subscriptionId, {
                    items: [{
                        id: itemId,
                        price: membership.stripe_price_id
                    }],
                    proration_behavior: 'none'
                })
            } catch (e) {
                subscriptionId = null
            }
        }

        if (!subscriptionId) {
            // Check for existing active subscription (Family Sharing)
            const activeSubs = await stripe.subscriptions.list({
                customer: student.stripe_customer_id,
                status: 'active',
                limit: 1
            })

            if (activeSubs.data.length > 0) {
                // Link to existing subscription (Sibling)
                subscriptionId = activeSubs.data[0].id
                console.log(`[Stripe] Found existing subscription ${subscriptionId}, linking student ${studentId}`)
            } else {
                // Calculate Billing Anchor
                // If today is 1st -> Start Immediately (Normal)
                // If today is NOT 1st -> Start Next Month 1st (Stub period)
                const now = new Date()
                const isFirstOfMonth = now.getDate() === 1

                const subscriptionParams: any = {
                    customer: student.stripe_customer_id,
                    items: [{ price: membership.stripe_price_id }],
                    payment_behavior: 'default_incomplete',
                    expand: ['latest_invoice.payment_intent'],
                }

                if (!isFirstOfMonth) {
                    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
                    const nextMonthTimestamp = Math.floor(nextMonth.getTime() / 1000)

                    subscriptionParams.billing_cycle_anchor = nextMonthTimestamp
                    subscriptionParams.proration_behavior = 'none'
                }

                // Create new subscription
                const subscription = await stripe.subscriptions.create(subscriptionParams)
                subscriptionId = subscription.id
            }
        }

        // Update DB
        const { error: dbError } = await supabase.from('students').update({
            membership_type_id: membershipTypeId,
            stripe_subscription_id: subscriptionId,
            next_membership_type_id: null // Clear any reservation since we applied a change
        }).eq('id', studentId)

        if (dbError) throw dbError

        revalidatePath(`/customers/${studentId}`)
        return { success: true }

    } catch (error: any) {
        console.error('Assign Membership Error:', error)
        return { success: false, error: error.message || 'Failed to update membership' }
    }
}
