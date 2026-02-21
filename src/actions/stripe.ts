'use server'

import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { revalidatePath } from 'next/cache'
import * as fs from 'fs'
import * as path from 'path'

function debugLog(msg: string) {
    try {
        const logPath = path.join(process.cwd(), 'debug_membership.log')
        const time = new Date().toISOString()
        fs.appendFileSync(logPath, `[${time}] ${msg}\n`)
    } catch (e) {
        console.error('Failed to write debug log:', e)
    }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://manager.swim-partners.com'

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

export async function updateStudentStripeId(studentId: string, stripeCustomerId: string) {
    const supabase = await createClient()

    try {
        // Auth Check (Admin Only recommended, assuming user is admin/staff)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        // Fetch Student
        const { data: student } = await supabase
            .from('students')
            .select('id')
            .eq('id', studentId)
            .single()

        if (!student) return { success: false, error: 'Student not found' }

        const { error } = await supabase
            .from('students')
            .update({ stripe_customer_id: stripeCustomerId })
            .eq('id', studentId)

        if (error) throw error

        revalidatePath(`/customers/${studentId}`)
        return { success: true }
    } catch (error: any) {
        console.error('Update Stripe ID Error:', error)
        return { success: false, error: error.message }
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
            success_url: `${APP_URL}/customers/${studentId}?payment_setup=success`,
            cancel_url: `${APP_URL}/customers/${studentId}?payment_setup=cancel`,
            payment_method_types: ['card'],
        })

        return { success: true, url: session.url }
    } catch (error: any) {
        console.error('Stripe Setup Link Error:', error)
        return { success: false, error: error.message || 'Failed to create setup link' }
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
                    // Changed: Disable proration, add manual full price item
                    subscriptionParams.proration_behavior = 'none'
                    subscriptionParams.add_invoice_items = [{
                        price: membership.stripe_price_id,
                        quantity: 1
                    }]
                }

                debugLog(`[AssignMembership] Creating Sub: ${JSON.stringify(subscriptionParams)}`)

                // Create new subscription
                const subscription = await stripe.subscriptions.create(subscriptionParams)
                subscriptionId = subscription.id
                debugLog(`[AssignMembership] Created Sub ID: ${subscriptionId}`)
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
        debugLog(`[AssignMembership] Error: ${error.message}`)
        return { success: false, error: error.message || 'Failed to update membership' }
    }
}

export async function createImmediatePaymentInvoice(scheduleId: string) {
    const supabase = await createClient()

    try {
        // 1. Fetch Schedule & Student
        const { data: schedule } = await supabase
            .from('lesson_schedules')
            .select(`
                id,
                title,
                start_time,
                price,
                student:students (
                    id,
                    stripe_customer_id,
                    email:contact_email
                )
            `)
            .eq('id', scheduleId)
            .single()

        if (!schedule) throw new Error('Schedule not found')
        // @ts-ignore
        if (!schedule.student?.stripe_customer_id) throw new Error('No Stripe Customer ID')
        if (!schedule.price) throw new Error('Price not set')

        // 2. Create Invoice Item
        // @ts-ignore
        const customerId = schedule.student.stripe_customer_id
        const itemDescription = `追加レッスン料 (${new Date(schedule.start_time).toLocaleDateString()}): ${schedule.title}`

        const invoiceItem = await stripe.invoiceItems.create({
            customer: customerId,
            amount: schedule.price,
            currency: 'jpy',
            description: itemDescription,
            metadata: {
                schedule_id: schedule.id,
                type: 'immediate_overage'
            }
        })

        // 3. Create Invoice (Collection Method: send_invoice)
        const invoice = await stripe.invoices.create({
            customer: customerId,
            collection_method: 'send_invoice',
            days_until_due: 1, // Due tomorrow basically
            auto_advance: true, // Auto-finalize
            metadata: {
                schedule_id: schedule.id,
                type: 'immediate_overage'
            }
        })

        // 4. Finalize
        const finalized = await stripe.invoices.finalizeInvoice(invoice.id)

        // [FIX] Casting to any to avoid "payment_intent does not exist on type Response<Invoice>" error
        const paymentIntentId = (finalized as any).payment_intent

        // 5. Update DB
        await supabase
            .from('lesson_schedules')
            .update({
                billing_status: 'awaiting_payment', // Confirmed status
                stripe_invoice_item_id: invoiceItem.id,
                // Handle payment_intent id extraction (string or object)
                payment_intent_id: typeof paymentIntentId === 'string' ? paymentIntentId : paymentIntentId?.id ?? null
            })
            .eq('id', scheduleId)

        return {
            success: true,
            invoiceUrl: finalized.hosted_invoice_url,
            paymentIntentId: typeof paymentIntentId === 'string' ? paymentIntentId : paymentIntentId?.id ?? null
        }

    } catch (error: any) {
        console.error('Create Immediate Invoice Error:', error)
        return { success: false, error: error.message }
    }
}

export async function createStripeInvoiceItemOnly(scheduleId: string) {
    const supabase = await createClient()

    try {
        // 1. Fetch Schedule & Student
        const { data: schedule } = await supabase
            .from('lesson_schedules')
            .select(`
                id,
                title,
                start_time,
                price,
                student:students (
                    id,
                    stripe_customer_id,
                    email:contact_email
                )
            `)
            .eq('id', scheduleId)
            .single()

        if (!schedule) throw new Error('Schedule not found')
        // @ts-ignore
        if (!schedule.student?.stripe_customer_id) throw new Error('No Stripe Customer ID')
        if (!schedule.price) throw new Error('Price not set')

        // 2. Create Invoice Item (Pending, will be picked up by the next invoice/subscription)
        // @ts-ignore
        const customerId = schedule.student.stripe_customer_id
        const itemDescription = `追加レッスン料 (${new Date(schedule.start_time).toLocaleDateString('ja-JP')}): ${schedule.title}`

        const invoiceItem = await stripe.invoiceItems.create({
            customer: customerId,
            amount: schedule.price,
            currency: 'jpy',
            description: itemDescription,
            metadata: {
                schedule_id: schedule.id,
                type: 'deferred_overage'
            }
        })

        // 3. Update DB
        await supabase
            .from('lesson_schedules')
            .update({
                billing_status: 'ready_to_invoice', // Waiting for the next monthly invoice
                stripe_invoice_item_id: invoiceItem.id
            })
            .eq('id', scheduleId)

        return {
            success: true,
            invoiceItemId: invoiceItem.id
        }

    } catch (error: any) {
        console.error('Create Invoice Item Only Error:', error)
        return { success: false, error: error.message }
    }
}
