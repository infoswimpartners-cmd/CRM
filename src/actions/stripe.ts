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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://member.swim-partners.com'

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
            name: student.full_name || undefined,
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

export async function assignMembership(studentId: string, membershipTypeId: string | null, startTiming: 'immediate' | 'next' | 'next_next' = 'immediate') {
    const supabase = await createClient()

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // --- RESERVATION MODE ---
    try {
        // 2. Fetch Student with subscription info
        const { data: student } = await supabase
            .from('students')
            .select('stripe_customer_id, stripe_subscription_id, membership_type_id, apply_pair_pricing, is_two_person_lesson, apply_pair_membership_fee')
            .eq('id', studentId)
            .single()

        if (!student) return { success: false, error: 'Student not found' }

        // --- CASE: Unassign (Remove Membership) ---
        if (!membershipTypeId) {
            if (startTiming === 'next_next') {
                // 再来月からの予約を解除
                await supabase.from('students').update({
                    next_next_membership_type_id: null
                }).eq('id', studentId)

                revalidatePath(`/customers/${studentId}`)
                return { success: true }
            }

            if (startTiming === 'next') {
                // 来月からの予約を解除
                await supabase.from('students').update({
                    next_membership_type_id: null
                }).eq('id', studentId)

                revalidatePath(`/customers/${studentId}`)
                return { success: true }
            }

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
                next_membership_type_id: null
            }).eq('id', studentId)

            revalidatePath(`/customers/${studentId}`)
            return { success: true }
        }

        // --- CASE: Assign/Change Membership ---
        if (!student.stripe_customer_id) {
            return { success: false, error: '支払い方法が登録されていません。先にカード登録を完了してください。' }
        }

        if (startTiming === 'next_next') {
            // 再来月の場合はStripeには触らずデータベースのみ更新
            const { error: dbError } = await supabase.from('students')
                .update({ next_next_membership_type_id: membershipTypeId })
                .eq('id', studentId)

            if (dbError) throw dbError

            revalidatePath(`/customers/${studentId}`)
            return { success: true }
        }

        const { data: membership } = await supabase
            .from('membership_types')
            .select('name, stripe_price_id, fee, pair_fee, stripe_pair_price_id')
            .eq('id', membershipTypeId)
            .single()

        if (!membership?.stripe_price_id) {
            return { success: false, error: 'この会員種別はStripeと連携されていません。' }
        }

        // 生徒がペア受講対象かつ、ペア月謝会費適用フラグが有効（デフォルト）であるかを判定
        const isPairStudent = !!student.apply_pair_pricing || !!student.is_two_person_lesson
        const applyPairFee = isPairStudent && (student.apply_pair_membership_fee !== false)

        let targetPriceId = membership.stripe_price_id
        let targetFee = membership.fee

        if (applyPairFee && membership.stripe_pair_price_id) {
            targetPriceId = membership.stripe_pair_price_id
            targetFee = membership.pair_fee || Math.round(membership.fee * 1.5) // マスタにペア会費が未登録の場合はフォールバックとして1.5倍
            debugLog(`[AssignMembership] Using Pair Price ID: ${targetPriceId} (fee: ${targetFee}) for student ${studentId}`)
        } else {
            debugLog(`[AssignMembership] Using Normal Price ID: ${targetPriceId} (fee: ${targetFee}) for student ${studentId}`)
        }

        // --- ENVIRONMENT MAPPING (TEST MODE ONLY) ---
        const isTestMode = process.env.NODE_ENV !== 'production' && !targetPriceId.startsWith('price_live')
        
        // テスト環境で本番用価格ID（price_1TN...）を検知した場合、テスト用IDに差し替える
        if (isTestMode && targetPriceId === 'price_1TNtfKP0UQGtpYXmwzZ3Bp4s') {
            targetPriceId = 'price_1SwGXsP0UQGtpYXmHVVBOKjm'; // テスト用: テスト月2回会員
            debugLog(`[AssignMembership] Mapping Live Price to Test Price: ${targetPriceId}`);
        }

        let subscriptionId = student.stripe_subscription_id

        // Validate current subscription
        if (subscriptionId) {
            try {
                const sub = await stripe.subscriptions.retrieve(subscriptionId)
                if (sub.status === 'canceled') {
                    subscriptionId = null
                }
            } catch (e) {
                subscriptionId = null
            }
        }

        if (subscriptionId) {
            // Update existing subscription
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)
            const itemId = subscription.items.data[0].id

            await stripe.subscriptions.update(subscriptionId, {
                items: [{
                    id: itemId,
                    price: targetPriceId
                }],
                // 来月からの場合は案分なし（次期から適用）、今すぐの場合は即時適用（即時決済は行わず、次月に合算請求）
                proration_behavior: startTiming === 'next' ? 'none' : 'create_prorations'
            })
        } else {
            // Create new subscription
            // Calculate Billing Anchor
            const nowUtc = new Date();
            const nowJst = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000);
            const nextMonthJst = new Date(Date.UTC(
                nowJst.getUTCFullYear(),
                nowJst.getUTCMonth() + 1, // 翌月
                1,                        // 1日
                -9, 0, 0                  // UTC基準で -9時間 = JSTの0時
            ));
            const anchorTimestamp = Math.floor(nextMonthJst.getTime() / 1000);

            const subscriptionParams: any = {
                customer: student.stripe_customer_id,
                items: [{ price: targetPriceId }],
                billing_cycle_anchor: anchorTimestamp,
                proration_behavior: 'none',
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent'],
            }

            // 「今すぐ変更（即時決済）」かつ初期費用が発生する場合
            // 即時での引き落としは行わず、インボイスアイテム（保留状態）としてStripeに登録し、次月の月謝請求と自動的に合算されるようにします。
            if (startTiming === 'immediate' && targetFee > 0) {
                try {
                    await stripe.invoiceItems.create({
                        customer: student.stripe_customer_id,
                        amount: targetFee,
                        currency: 'jpy',
                        description: `初期費用（初月分会費）: ${membership.name}${applyPairFee ? '（ペア）' : ''}`
                    })
                    debugLog(`[AssignMembership] Created pending invoice item for fee: ${targetFee}. This will be combined with the next monthly invoice.`)
                } catch (e) {
                    console.error('Pending Charge Invoice Item Error:', e)
                }
            }

            debugLog(`[AssignMembership] Creating Sub (startTiming=${startTiming}): ${JSON.stringify(subscriptionParams)}`)
            const subscription = await stripe.subscriptions.create(subscriptionParams)
            subscriptionId = subscription.id
        }

        // Update DB
        const updates: any = {
            stripe_subscription_id: subscriptionId,
        }

        if (startTiming === 'next') {
            updates.next_membership_type_id = membershipTypeId
            updates.next_next_membership_type_id = null
        } else {
            updates.membership_type_id = membershipTypeId
            updates.next_membership_type_id = null
            updates.next_next_membership_type_id = null
        }

        const { error: dbError } = await supabase.from('students')
            .update(updates)
            .eq('id', studentId)

        if (dbError) throw dbError

        revalidatePath(`/customers/${studentId}`)
        return { success: true }

    } catch (error: any) {
        console.error('[AssignMembership] Error:', error)
        return { success: false, error: error.message || 'プランの割り当てに失敗しました' }
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

// THE TRIO専用 チケット購入 (Checkout Session作成)
export async function createTrioTicketCheckoutSession(studentId: string, ticketCount: number = 1) {
    const supabase = await createClient()

    try {
        // 1. Fetch Student
        const { data: student } = await supabase
            .from('students')
            .select('stripe_customer_id, contact_email, full_name')
            .eq('id', studentId)
            .single()

        if (!student) return { success: false, error: 'Student not found' }
        if (!student.stripe_customer_id) return { success: false, error: 'クレジットカードの登録がありません。マイページより登録を完了してください。' }

        // 仮の決済価格 (本番はProduct/Price IDを用いるかDB設定から引く)
        const TRIO_TICKET_PRICE = 5000;
        const totalAmount = TRIO_TICKET_PRICE * ticketCount;

        const session = await stripe.checkout.sessions.create({
            customer: student.stripe_customer_id,
            mode: 'payment',
            currency: 'jpy',
            line_items: [
                {
                    price_data: {
                        currency: 'jpy',
                        product_data: {
                            name: 'THE TRIO レッスンチケット',
                            description: '最大3名のマッチング・ファースト型プレミアム水泳教室参加チケット',
                        },
                        unit_amount: TRIO_TICKET_PRICE,
                    },
                    quantity: ticketCount,
                }
            ],
            success_url: `${APP_URL}/trio/dashboard?ticket_purchase=success`,
            cancel_url: `${APP_URL}/trio/dashboard?ticket_purchase=cancel`,
            metadata: {
                studentId: studentId,
                type: 'trio_ticket_purchase',
                ticketAmount: ticketCount.toString()
            }
        })

        return { success: true, url: session.url }
    } catch (error: any) {
        console.error('Create Trio Ticket Checkout Session Error:', error)
        return { success: false, error: error.message || 'チケット購入画面の生成に失敗しました' }
    }
}
