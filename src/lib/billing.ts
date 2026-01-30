import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { startOfMonth, subMonths, endOfMonth, format } from 'date-fns'

export async function runMonthlyBilling() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        }
    )
    const log: string[] = []

    // 1. Target Period (Last Month for Usage)
    const today = new Date()
    const lastMonthStart = startOfMonth(subMonths(today, 1))
    const lastMonthEnd = endOfMonth(subMonths(today, 1))
    const thisMonthStr = format(today, 'yyyy-MM')

    log.push(`Starting Billing for Period: ${format(lastMonthStart, 'yyyy-MM-dd')} - ${format(lastMonthEnd, 'yyyy-MM-dd')}`)

    // 2. Fetch Active Students with Stripe Customer ID
    const { data: students, error: studentError } = await supabase
        .from('students')
        .select(`
            id, full_name, stripe_customer_id, stripe_subscription_id, status,
            membership_types ( id, name, fee )
        `)
        .not('stripe_customer_id', 'is', null)
        .eq('status', 'active') // Restoring status filter for efficiency

    if (studentError) {
        log.push(`DB Error fetching students: ${studentError.message} (${studentError.code})`)
        console.error(studentError)
        return log
    }

    if (!students || students.length === 0) {
        log.push('No active students with Stripe ID found.')
        return log
    }

    log.push(`Found ${students.length} students to process.`)

    for (const studentObj of students) {
        const student = studentObj as any; // Cast to suppress TS errors

        if (!student.stripe_customer_id) continue

        try {
            log.push(`Processing Student: ${student.full_name} (${student.stripe_customer_id})`)

            // Resolve Membership Type
            const membership = Array.isArray(student.membership_types)
                ? student.membership_types[0]
                : student.membership_types

            if (membership) {
                log.push(`   Membership: ${membership.name} (¥${membership.fee})`)
            } else {
                log.push(`   No membership type assigned.`)
            }

            // A. Add Membership Fee
            let addedMembershipFee = false
            if (membership?.fee && membership.fee > 0) {
                if (student.stripe_subscription_id) {
                    log.push(` - Membership Fee: ¥${membership.fee} (Handled by Subscription: ${student.stripe_subscription_id})`)
                } else {
                    await stripe.invoiceItems.create({
                        customer: student.stripe_customer_id,
                        amount: membership.fee,
                        currency: 'jpy',
                        description: `${thisMonthStr}月分 会費 (${membership.name})`
                    })
                    log.push(` - Added Membership Fee: ¥${membership.fee} (Manual Invoice Item)`)
                    addedMembershipFee = true
                }
            }

            // B. Add Usage Fees (Based on 'billing_price')
            // Fetch completed lessons in last month range
            const { data: lessons, error: lessonError } = await supabase
                .from('lessons')
                .select(`
                    id, lesson_date, price, billing_price, stripe_invoice_item_id,
                    lesson_masters ( name )
                `)
                .eq('student_id', student.id)
                .gte('lesson_date', lastMonthStart.toISOString())
                .lte('lesson_date', lastMonthEnd.toISOString())

            if (lessonError) {
                log.push(`   ERROR fetching lessons: ${lessonError.message}`)
            }

            let usageTotal = 0
            if (lessons) {
                log.push(`   Found ${lessons.length} lessons between ${format(lastMonthStart, 'MM/dd')} - ${format(lastMonthEnd, 'MM/dd')}`)
                for (const lesson of lessons) {
                    if (lesson.stripe_invoice_item_id) {
                        log.push(`     - Skipped lesson (Already Billed: ${lesson.stripe_invoice_item_id})`)
                        continue
                    }

                    const chargeAmount = lesson.billing_price ?? 0

                    if (chargeAmount > 0) {
                        try {
                            // Resolve Lesson Master
                            const master = Array.isArray(lesson.lesson_masters)
                                ? lesson.lesson_masters[0]
                                : lesson.lesson_masters

                            const invoiceItem = await stripe.invoiceItems.create({
                                customer: student.stripe_customer_id,
                                amount: chargeAmount,
                                currency: 'jpy',
                                description: `${format(new Date(lesson.lesson_date), 'MM/dd')} レッスン (${master?.name || 'レッスン'})`
                            })

                            // Save Stripe Invoice Item ID
                            await supabase.from('lessons')
                                .update({ stripe_invoice_item_id: invoiceItem.id })
                                .eq('id', lesson.id)

                            usageTotal += chargeAmount
                            log.push(`     - Added Item: ¥${chargeAmount} (${master?.name || 'レッスン'}) -> ${invoiceItem.id}`)
                        } catch (invError: any) {
                            log.push(`     - ERROR adding invoice item: ${invError.message}`)
                        }
                    } else {
                        log.push(`     - Skipped lesson (Billing Price: ¥${chargeAmount})`)
                    }
                }
            }
            if (usageTotal > 0) log.push(` - Added Usage Fees: ¥${usageTotal} (${lessons?.length || 0} lessons)`)
            else log.push(` - No billable usage found.`)

            // C. Create & Finalize Invoice
            // Logic: If Subscription exists, we leave items as 'pending' for the subscription to pick up.
            // If NO subscription, we manualy create an invoice to charge them.
            if (student.stripe_subscription_id) {
                if (usageTotal > 0) {
                    log.push(` - Usage fees (¥${usageTotal}) added to pending Subscription invoice.`)
                } else {
                    log.push(` - No usage fees added.`)
                }
            } else {
                // Legacy Manual Invoice Logic
                if (addedMembershipFee || usageTotal > 0) {
                    const invoice = await stripe.invoices.create({
                        customer: student.stripe_customer_id,
                        auto_advance: true,
                        collection_method: 'charge_automatically',
                        description: `${thisMonthStr}月度 請求書`
                    })
                    log.push(` - Created Manual Invoice: ${invoice.id} (Status: ${invoice.status})`)
                } else {
                    log.push(` - No billable items this month.`)
                }
            }

        } catch (e: any) {
            log.push(`ERROR processing student ${student.full_name}: ${e.message}`)
            console.error(e)
        }
    }

    return log
}
