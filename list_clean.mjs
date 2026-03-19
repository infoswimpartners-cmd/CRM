import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const { data, error } = await supabase
        .from('students')
        .select('id, full_name, stripe_customer_id, stripe_subscription_id, membership_type_id, status')

    if (error) {
        console.error(error)
        return
    }

    for (const s of data) {
        console.log(`${s.full_name.padEnd(10)} | ${String(s.stripe_customer_id).padEnd(20)} | ${String(s.stripe_subscription_id).padEnd(25)} | mem=${s.membership_type_id}`)
    }
}
main()
