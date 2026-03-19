import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const { data, error } = await supabase
        .from('students')
        .select('id, full_name, membership_type_id, stripe_customer_id, stripe_subscription_id, is_bank_transfer, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

    if (error) {
        console.error(error)
        return
    }

    for (const s of data) {
        console.log(`${s.created_at} | ${s.full_name} | cus=${s.stripe_customer_id} | sub=${s.stripe_subscription_id} | mem=${s.membership_type_id}`)
    }
}
main()
