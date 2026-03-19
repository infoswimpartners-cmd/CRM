import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const { data, error } = await supabase
        .from('students')
        .select('id, full_name, membership_type_id, stripe_customer_id, stripe_subscription_id, is_bank_transfer, updated_at')
        .order('updated_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error(error)
        return
    }

    console.log("Recently updated students:")
    for (const s of data) {
        const hasCus = !!s.stripe_customer_id;
        const hasSub = !!s.stripe_subscription_id;
        console.log(`${s.updated_at} | ${s.full_name} | mem=${s.membership_type_id} | cus=${hasCus ? s.stripe_customer_id : 'NO'} | sub=${hasSub ? s.stripe_subscription_id : 'NO'} | bank=${s.is_bank_transfer}`)
    }
}
main()
