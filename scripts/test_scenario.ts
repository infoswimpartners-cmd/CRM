
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Stripe } from 'stripe'

dotenv.config({ path: '.env.local' })

const BASE_URL = 'http://localhost:3000'
const TEST_EMAIL = `test_flow_v2_${Date.now()}@example.com`
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-12-15.clover' as any })

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('🚀 Starting Test Scenario V2: 3-Phase Refactored')
    console.log(`📧 Test Email: ${TEST_EMAIL}`)

    // --- Phase 1: Onboarding (Lead) ---
    console.log('\n--- [Phase 1] Onboarding (Lead) ---')
    const trialRes = await fetch(`${BASE_URL}/api/webhooks/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test Student V2',
            email: TEST_EMAIL,
            type: 'inquiry',
            message: 'Testing New Flow'
        })
    })

    if (!trialRes.ok) {
        console.error('❌ Phase 1 Failed:', await trialRes.text())
        process.exit(1)
    }

    const leadData = await trialRes.json()
    console.log('✅ Phase 1 Success:', leadData)

    // Verify DB Status
    let { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('contact_email', TEST_EMAIL)
        .single()

    console.log(`   DB Status: ${student.status} (Expected: inquiry)`)
    if (student.stripe_customer_id) {
        console.error('❌ Error: Stripe Customer should NOT be created yet.')
    } else {
        console.log('✅ Verified: No Stripe Customer yet.')
    }

    // --- Phase 1.5: Admin Trial Action (Simulation) ---
    console.log('\n--- [Phase 1.5] Admin Trial Action (Simulation) ---')
    // Simulate what the Server Action does:

    // 1. Create Stripe Customer
    console.log('   Simulating Admin Action: Creating Stripe Customer...')
    const customer = await stripe.customers.create({
        email: TEST_EMAIL,
        name: 'Test Student V2'
    })

    // 2. Update Student
    await supabase
        .from('students')
        .update({
            stripe_customer_id: customer.id,
            status: 'trial_pending'
        })
        .eq('id', student.id)

    console.log(`   Updated Student: Assigned Stripe ID ${customer.id}, Status -> trial_pending`)

    // 3. Simulate Payment Completion
    // (Skipping actual Checkout creation, assuming payment done)
    await supabase.from('students').update({ status: 'trial_confirmed' }).eq('id', student.id)
    console.log('   Simulating Payment: Status -> trial_confirmed')


    // --- Phase 2: Enrollment (Future Start) ---
    console.log('\n--- [Phase 2] Enrollment (Future Start) ---')
    // Pick a valid plan
    const { data: plans } = await supabase.from('membership_types').select('name').limit(1)
    const planName = plans?.[0]?.name || '月4回（60分）'

    // Calculate Target Month (Next + 1 Month to test future anchor?)
    // Let's use Next Month.
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const startDateStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}` // YYYY-MM

    console.log(`   Enrolling in Plan: ${planName}, Start Date: ${startDateStr}`)

    const enrollRes = await fetch(`${BASE_URL}/api/webhooks/enrollment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: TEST_EMAIL,
            plan_name: planName,
            start_date: startDateStr
        })
    })

    if (!enrollRes.ok) {
        console.error('❌ Enrollment Request Failed:', await enrollRes.text())
    } else {
        const enrollData = await enrollRes.json()
        console.log('✅ Enrollment Webhook Success:', enrollData)

        // Fetch Subscription to verify Anchor
        if (enrollData.subscriptionId) {
            const sub = await stripe.subscriptions.retrieve(enrollData.subscriptionId)
            const anchorDate = new Date(sub.billing_cycle_anchor * 1000)
            console.log(`   Stripe Subscription Anchor: ${anchorDate.toISOString()}`)

            const expectedAnchor = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1) // Local 1st? Stripe uses Unix TS.
            // Check if it matches roughly the 1st of target month
            console.log(`   Expected Anchor: ${expectedAnchor.toISOString()} (Roughly)`)
        }
    }

    // Verify DB Status Final
    const { data: finalStudent } = await supabase
        .from('students')
        .select('*')
        .eq('contact_email', TEST_EMAIL)
        .single()

    console.log(`   Final DB Status: ${finalStudent.status} (Expected: active)`)

    console.log('\n✅ Test Scenario V2 Complete!')
}

main()
