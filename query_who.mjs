import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const ids = ['cus_U6AfeAEaWeLyHP', 'cus_U4cJo1Fjtk5NHm']
    const { data, error } = await supabase
        .from('students')
        .select('id, full_name, membership_type_id, stripe_customer_id, stripe_subscription_id, is_bank_transfer')
        .in('stripe_customer_id', ids)

    console.log("By stripe ID:")
    console.log(data)

    const { data: data2 } = await supabase
        .from('students')
        .select('id, full_name, membership_type_id, stripe_customer_id, stripe_subscription_id, is_bank_transfer')
        .like('full_name', '%中瀬%')

    console.log("\nBy Name '中瀬':")
    console.log(data2)
}
main()
