import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const stripeSecret = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY

if (!supabaseUrl || !supabaseKey || !stripeSecret) {
    console.error("Missing environment variables. Make sure .env.local exists and has values.")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const stripe = new Stripe(stripeSecret)

async function test() {
    console.log("=== Testing Online Enrollment Stripe Checkout Creation ===")
    
    // 1. テスト太郎の情報を取得
    const { data: student, error: stdError } = await supabase
        .from('students')
        .select('*')
        .ilike('full_name', '%テスト太郎%')
        .single()

    if (stdError || !student) {
        console.error("Failed to fetch Test Taro:", stdError)
        return
    }

    console.log(`Found Test Taro! Student ID: ${student.id}, LINE ID: ${student.line_user_id}`)

    // 2. アクティブなプラン（月4回など）を取得
    const { data: plans, error: planError } = await supabase
        .from('membership_types')
        .select('*')
        .eq('active', true)
        .limit(1)

    if (planError || !plans || plans.length === 0) {
        console.error("Failed to fetch active plans:", planError)
        return
    }

    const testPlan = plans[0]
    let targetPriceId = testPlan.stripe_price_id

    // 本番用価格IDとテスト環境用価格IDのマッピング辞書（テスト環境の確実にrecurringなプランへマッピング）
    const PRICE_ID_MAP = {
        'price_1SwKVeP0UQGtpYXmSy0PGWDT': 'price_1TSX3TP0UQGtpYXmAfC6TLIO',
        'price_1SwKVdP0UQGtpYXm59IYOlUQ': 'price_1TSX3TP0UQGtpYXmAfC6TLIO',
        'price_1SwKVcP0UQGtpYXmhnr0o5EF': 'price_1TSX3TP0UQGtpYXmAfC6TLIO',
        'price_1SwKVfP0UQGtpYXm9cgy3v1g': 'price_1TSX3TP0UQGtpYXmAfC6TLIO',
        'price_1SwKVcP0UQGtpYXmJqUXBecy': 'price_1TSX3TP0UQGtpYXmAfC6TLIO',
        'price_1SwKVdP0UQGtpYXmjXxiPSK6': 'price_1TSX3TP0UQGtpYXmAfC6TLIO',
        'price_1TNtfKP0UQGtpYXmwzZ3Bp4s': 'price_1TSX3TP0UQGtpYXmAfC6TLIO',
    }

    if (PRICE_ID_MAP[targetPriceId]) {
        console.log(`Mapping ${targetPriceId} -> ${PRICE_ID_MAP[targetPriceId]} for test`)
        targetPriceId = PRICE_ID_MAP[targetPriceId]
    }

    console.log(`Using plan for test: ${testPlan.name} (Mapped Price ID: ${targetPriceId})`)

    // 3. Stripe Checkout Session の生成シミュレーション
    try {
        const sessionConfig = {
            mode: 'subscription',
            payment_method_types: ['card'],
            success_url: 'https://manager.swim-partners.com/enroll/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://manager.swim-partners.com/enroll?cancel=true',
            line_items: [
                {
                    price: targetPriceId,
                    quantity: 1,
                }
            ],
            metadata: {
                type: 'membership_enrollment',
                line_user_id: student.line_user_id,
                membership_type_id: testPlan.id,
                studentId: student.id,
            },
            subscription_data: {
                metadata: {
                    type: 'membership_enrollment',
                    line_user_id: student.line_user_id,
                    membership_type_id: testPlan.id,
                    studentId: student.id,
                }
            }
        }

        // テスト用カスタマーIDの指定
        if (student.stripe_customer_id) {
            sessionConfig.customer = student.stripe_customer_id
        }

        console.log("Creating Stripe Checkout Session...")
        const session = await stripe.checkout.sessions.create(sessionConfig)

        console.log("\n✅ SUCCESS!")
        console.log(`Session ID: ${session.id}`)
        console.log(`Checkout URL: ${session.url}`)
        console.log("Metadata verification:")
        console.log(JSON.stringify(session.metadata, null, 2))
        
    } catch (err) {
        console.error("❌ Stripe Session Creation Failed:", err)
    }
}

test()
