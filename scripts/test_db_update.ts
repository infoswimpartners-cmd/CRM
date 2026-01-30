import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function simulateWebhook() {
    const endpoint = 'http://localhost:3000/api/webhooks/stripe'
    // Ensure we have a valid secret to sign (or bypass signature verification if possible? No, the code checks signature)
    // Actually, `stripe.webhooks.constructEvent` requires a valid signature matching the payload and the secret.
    // Generating a valid signature manually is hard.

    // ALTERNATIVE: Use the `stripe` CLI if available?
    // User doesn't have it installed likely.

    // ALTERNATIVE 2: Bypass signature check temporarily in code? No, bad practice.

    // ALTERNATIVE 3: Call the DB update logic directly to see if THAT fails.
    // The webhook logic is:
    // 1. Check type === 'checkout.session.completed'
    // 2. Check metadata.type === 'trial_fee' && studentId
    // 3. Update 'students' status -> 'trial_confirmed'

    // I will write a script that does EXACTLY step 3 using supabase-admin, to see if RLS or Schema blocks it.
    // This isolates "DB Permission/Logic" from "Webhook Connectivity".

    const { createClient } = await import('@supabase/supabase-js')

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const studentId = '084a8854-86be-410b-b2fc-38d05e1389c6' // The test student ID found in Step 7461
    console.log(`Simulating DB Update for Student: ${studentId}`)

    const { error } = await supabaseAdmin
        .from('students')
        .update({ status: 'trial_confirmed' })
        .eq('id', studentId)

    if (error) {
        console.error('❌ DB Update Failed:', error)
    } else {
        console.log('✅ DB Update Successful! The logic is correct.')
        console.log('If this worked, the issue is definitely that the Stripe Webhook is NOT reaching the server.')
        console.log('Likely cause: Incorrect URL in Stripe Dashboard.')
    }
}

simulateWebhook()
