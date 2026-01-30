
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'
import { emailService } from '@/lib/email'

const enrollmentSchema = z.object({
    email: z.string().email(),
    plan_name: z.string().min(1),
    start_date: z.string().regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM").optional(),
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const result = enrollmentSchema.safeParse(body)

        if (!result.success) {
            return NextResponse.json(
                { error: 'Validation Failed', details: result.error.flatten() },
                { status: 400 }
            )
        }

        const { email, plan_name, start_date } = result.data
        const supabaseAdmin = createAdminClient()

        console.log(`[Enrollment] Processing enrollment for ${email} -> Plan: ${plan_name}, Start: ${start_date || 'Default'}`)

        // 1. Find Student
        const { data: student, error: studentError } = await supabaseAdmin
            .from('students')
            .select('*')
            .eq('contact_email', email)
            .single()

        if (studentError || !student) {
            console.error(`[Enrollment] Student not found: ${email}`)
            return NextResponse.json({ error: 'Student not found. Please register for trial first.' }, { status: 404 })
        }

        if (!student.stripe_customer_id) {
            console.error(`[Enrollment] Student has no Stripe Customer ID: ${student.id}`)
            return NextResponse.json({ error: 'Stripe Customer not found for student.' }, { status: 400 })
        }

        // 2. Resolve Plan (Membership Type)
        const { data: membershipType, error: membershipError } = await supabaseAdmin
            .from('membership_types')
            .select('*')
            .eq('name', plan_name)
            .single()

        if (membershipError || !membershipType) {
            console.error(`[Enrollment] Plan not found: ${plan_name}`)
            return NextResponse.json({ error: 'Invalid Plan Name' }, { status: 400 })
        }

        if (!membershipType.stripe_price_id) {
            console.error(`[Enrollment] Plan has no Stripe Price ID: ${membershipType.id}`)
            return NextResponse.json({ error: 'System Configuration Error: Price not found' }, { status: 500 })
        }

        // 3. Create Stripe Subscription
        const now = new Date()
        // Default anchor is 1st of NEXT month (to give free period / gap billing for rest of current month)
        const nextMonthDefault = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        let anchorDate = nextMonthDefault

        if (start_date) {
            const [year, month] = start_date.split('-').map(Number)
            // Constructor: (year, monthIndex, day). monthIndex 0-11.
            // Input "2024-01" -> year 2024, month 1. monthIndex = 0.
            anchorDate = new Date(year, month - 1, 1)
        }

        // --- Anchor Validation ---
        // Subscription Anchor cannot be in the past.
        // If calculated anchor is in the past or today, we must bump it to the next valid cycle (Next Month 1st)
        // OR start immediately without anchor (if we want to bill now).
        // 
        // REQUIREMENT: "Gap Billing" (charge separately for pre-start lessons).
        // This implies the Subscription itself should NOT charge for the current/gap month.
        // Therefore, we want `proration_behavior: 'none'` and `billing_cycle_anchor` in the future.

        // If user selects "This Month" (Start Date <= Now), we treat it as "Next Month 1st" for subscription,
        // and allow "Gap Billing" to cover "This Month".
        // (This simplifies logic: Subscription always handles FUTURE months.)

        if (anchorDate < nextMonthDefault) {
            anchorDate = nextMonthDefault
        }

        const billingAnchor = Math.floor(anchorDate.getTime() / 1000)

        // Correction: If user selects far future (e.g. 3 months later), anchor works fine.
        // If user selects next month, anchor works fine.

        console.log(`[Enrollment] Creating Subscription... Anchor: ${anchorDate.toISOString()}`)

        const subscription = await stripe.subscriptions.create({
            customer: student.stripe_customer_id,
            items: [{ price: membershipType.stripe_price_id }],
            billing_cycle_anchor: billingAnchor,
            proration_behavior: 'none',
            metadata: {
                studentId: student.id,
                enrollmentSource: 'webhook',
                startMonth: start_date || 'default'
            }
        })

        // 4. Update Student
        const { error: updateError } = await supabaseAdmin
            .from('students')
            .update({
                status: 'active', // Use exact status string
                membership_type_id: membershipType.id,
                stripe_subscription_id: subscription.id
            })
            .eq('id', student.id)

        if (updateError) {
            console.error(`[Enrollment] DB Update Failed: ${updateError.message}`)
            // Note: Subscription was created but DB failed. 
            // Ideally we should rollback subscription, but logging is vital here.
            return NextResponse.json({ error: 'Database Update Failed' }, { status: 500 })
        }

        // 5. Send Notification
        // 5. Send Notification (Template)
        await emailService.sendTemplateEmail('enrollment_complete', email, {
            name: student.full_name,
            plan_name: membershipType.name,
            start_date: `${anchorDate.getFullYear()}年${anchorDate.getMonth() + 1}月1日`
        })

        console.log(`[Enrollment] Success! Student: ${student.id}, Sub: ${subscription.id}`)
        return NextResponse.json({ success: true, subscriptionId: subscription.id }, { status: 200 })

    } catch (error: any) {
        console.error('[Enrollment] Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
