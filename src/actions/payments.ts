'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

export type PaymentCustomerStatus = 'active' | 'paused' | 'unregistered'
export type PaymentMethod = 'card' | 'transfer' | 'cash' | 'unregistered'
export type PaymentState = 'paid' | 'pending' | 'error' | 'unbilled'

export interface PaymentTableRow {
    studentId: string
    customerStatus: PaymentCustomerStatus
    studentName: string
    planName: string
    paymentMethod: PaymentMethod
    paymentState: PaymentState
    trialPaymentOk: boolean | null
    nextBillingDate: string | null
    errorMessage?: string
    stripeCustomerId: string | null
}

export interface PaymentDashboardData {
    actionRequiredCount: number
    expectedMonthlyLanding: number
    rows: PaymentTableRow[]
}

export async function fetchPaymentDashboardData(month: string): Promise<PaymentDashboardData> {
    const supabase = createAdminClient()

    // First day and last day of the selected month
    const firstDay = new Date(`${month}-01T00:00:00.000Z`)
    const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0, 23, 59, 59, 999)

    const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
            id,
            full_name,
            status,
            stripe_customer_id,
            stripe_subscription_id,
            membership_type_id,
            membership:membership_types!students_membership_type_id_fkey(name)
        `)

    if (studentsError || !students) {
        throw new Error('Failed to fetch students data')
    }

    // 1. Fetch Stripe Subscriptions efficiently
    const activeSubIds = students
        .map(s => s.stripe_subscription_id)
        .filter(Boolean) as string[]

    const stripeSubscriptions = new Map<string, Stripe.Subscription>()
    const stripeCustomerMetadatas = new Map<string, any>()

    try {
        if (activeSubIds.length > 0) {
            // It might fetch all, or we could just list all active subscriptions.
            // Since there's a limit, we list all subscriptions.
            let hasMore = true
            let startingAfter: string | undefined = undefined
            while (hasMore) {
                const subs: any = await stripe.subscriptions.list({
                    limit: 100,
                    starting_after: startingAfter,
                    status: 'all',
                    expand: ['data.latest_invoice']
                })
                subs.data.forEach((sub: any) => stripeSubscriptions.set(sub.id, sub))
                hasMore = subs.has_more
                if (hasMore) startingAfter = subs.data[subs.data.length - 1].id
            }
        }
    } catch (e) {
        console.error('Stripe fetch subscriptions error', e)
    }

    // 2. Fetch Lesson Schedules
    const { data: lessonSchedules } = await supabase
        .from('lesson_schedules')
        .select('id, student_id, start_time, title, price, billing_status')
        .gte('start_time', firstDay.toISOString())
        .lte('start_time', lastDay.toISOString())

    const rows: PaymentTableRow[] = []
    let actionRequiredCount = 0
    let expectedMonthlyLanding = 0

    for (const student of students) {
        let paymentState: PaymentState = 'unbilled'
        let errorMessage: string | undefined = undefined
        let nextBillingDate: string | null = null
        let trialPaymentOk: boolean | null = null
        let paymentMethod: PaymentMethod = 'unregistered'
        let planName = student.membership ? (student.membership as any).name : '未契約'
        let customerStatus: PaymentCustomerStatus = student.status === '休会' ? 'paused' : student.membership_type_id ? 'active' : 'unregistered'

        // --- 1. Subscriptions Check ---
        if (student.stripe_customer_id) {
            paymentMethod = 'card' // Default since customer exists

            if (student.stripe_subscription_id) {
                const sub = stripeSubscriptions.get(student.stripe_subscription_id)
                if (sub) {
                    const current_period_end = (sub as any).current_period_end;
                    if (current_period_end) {
                        nextBillingDate = new Date(current_period_end * 1000).toISOString().split('T')[0]
                    }

                    if (sub.items.data.length > 0) {
                        expectedMonthlyLanding += sub.items.data[0].price.unit_amount || 0
                    }

                    const latestInvoice = sub.latest_invoice as Stripe.Invoice | null
                    if (latestInvoice) {
                        if (latestInvoice.status === 'paid') {
                            paymentState = 'paid'
                        } else if (latestInvoice.status === 'open') {
                            paymentState = 'pending'
                        } else if (latestInvoice.status === 'uncollectible') {
                            paymentState = 'error'
                            errorMessage = 'Stripe請求エラー'
                        }
                    }
                    if (sub.status === 'past_due' || sub.status === 'unpaid') {
                        paymentState = 'error'
                        errorMessage = 'サブスクリプション支払遅延'
                    }
                }
            } else if (!student.membership_type_id) {
                planName = '初回体験 / 都度払い'
            }
        } else {
            paymentMethod = 'unregistered'
        }

        // --- 2. Lesson Schedules (Overage / Trial) Check ---
        const studentLessons = lessonSchedules?.filter(ls => ls.student_id === student.id) || []

        for (const ls of studentLessons) {
            if (ls.price && ls.price > 0) {
                if (ls.billing_status === 'error') {
                    paymentState = 'error'
                    errorMessage = '決済エラー（追加・体験等）'
                } else if (ls.billing_status === 'awaiting_payment' || ls.billing_status === 'awaiting_approval' || ls.billing_status === 'ready_to_invoice') {
                    if (paymentState !== 'error') paymentState = 'pending'
                    expectedMonthlyLanding += ls.price

                    const hoursUntilStart = (new Date(ls.start_time).getTime() - new Date().getTime()) / (1000 * 60 * 60)
                    // First trial or unpaid lesson logic!
                    if (!student.membership_type_id) {
                        if (hoursUntilStart <= 48 && hoursUntilStart >= -720) { // Unpaid and within 48h or past
                            trialPaymentOk = false
                            if (paymentState !== 'error') {
                                paymentState = 'error' // Escalate to error for action required
                                errorMessage = '初回体験料金 未払い'
                            }
                        } else {
                            // still a warning if future
                            if (paymentState !== 'error') trialPaymentOk = false
                        }
                    }
                } else if (ls.billing_status === 'paid') {
                    expectedMonthlyLanding += ls.price
                    if (!student.membership_type_id) {
                        trialPaymentOk = true
                    }
                }
            }
        }

        if (paymentState === 'error') {
            actionRequiredCount++
        }

        rows.push({
            studentId: student.id,
            customerStatus,
            studentName: student.full_name,
            planName,
            paymentMethod,
            paymentState,
            trialPaymentOk,
            nextBillingDate,
            errorMessage,
            stripeCustomerId: student.stripe_customer_id
        })
    }

    return {
        actionRequiredCount,
        expectedMonthlyLanding,
        rows
    }
}
