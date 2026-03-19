import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const { data, error } = await supabase
        .from('students')
        .select('id, full_name, membership_type_id, stripe_customer_id, stripe_subscription_id, is_bank_transfer, status')

    if (error) {
        console.error(error)
        return
    }

    const { data, error } = await supabase.from("students").select("full_name, stripe_customer_id, stripe_subscription_id, membership_type_id"); console.log(data);
    for (const s of data) {
        if (s.stripe_customer_id !== null && s.stripe_customer_id !== undefined) {
            if (s.stripe_customer_id.trim() === '') {
                console.log(`[EMPTY STRING CUS] ${s.full_name} | ID=${s.id}`)
            }
        }
        if (s.stripe_customer_id && !s.stripe_subscription_id) {
            console.log(`[CUS BUT NO SUB] ${s.full_name} | cus=${s.stripe_customer_id} | mem=${s.membership_type_id}`)
        }
    }
}
main()
