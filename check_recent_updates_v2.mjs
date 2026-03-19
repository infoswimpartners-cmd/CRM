import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const { data, error } = await supabase
        .from('students')
        .select('id, full_name, membership_type_id, stripe_customer_id, stripe_subscription_id, is_bank_transfer, created_at')
        .order('created_at', { ascending: false })

    if (error) {
        console.error(error)
        return
    }

    console.log("Students with Stripe Cus but NO Sub:")
    let found = false;
    for (const s of data) {
        if (s.stripe_customer_id && !s.stripe_subscription_id) {
            console.log(`${s.created_at} | ${s.full_name} | mem=${s.membership_type_id} | cus=${s.stripe_customer_id} | bank=${s.is_bank_transfer}`)
            found = true;
        }
    }
    if (!found) console.log("None found currently in DB.")

    console.log("\nRecent 10 students overall:")
    for (const s of data.slice(0, 10)) {
        console.log(`${s.created_at} | ${s.full_name} | mem=${s.membership_type_id} | cus=${s.stripe_customer_id || 'NO'} | sub=${s.stripe_subscription_id || 'NO'}`)
    }
}
main()
