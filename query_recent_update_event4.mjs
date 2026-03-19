import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const { data, error } = await supabase
        .from('students')
        .select('id, full_name, membership_type_id, stripe_customer_id, stripe_subscription_id, is_bank_transfer')

    if (error) {
        console.error(error)
        return
    }

    // Find ANY student without sub, who HAVE stripe customer ID
    const filtered = data.filter(d =>
        !d.stripe_subscription_id &&
        d.stripe_customer_id
    )
    for (const s of filtered) {
        console.log(`${s.full_name}: cus=${s.stripe_customer_id}, is_bank_transfer=${s.is_bank_transfer}, mem=${s.membership_type_id}`)
    }
}
main()
