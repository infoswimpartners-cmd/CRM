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

    console.log("Total students:", data.length)

    let matchCount = 0;
    for (const s of data) {
        if (s.stripe_customer_id && !s.stripe_subscription_id) {
            console.log(`[Missing Sub] ${s.full_name}: cus=${s.stripe_customer_id}, mem=${s.membership_type_id}, bank=${s.is_bank_transfer}`)
            matchCount++;
        }
    }

    console.log("Total missing sub with cus:", matchCount)

    let tanpatsuMatch = 0;
    for (const s of data) {
        if (s.membership_type_id === '33dda43e-5c57-41c4-9303-6d9d907c43ab') {
            console.log(`[TANPATSU] ${s.full_name}: cus=${s.stripe_customer_id}, sub=${s.stripe_subscription_id}`)
            tanpatsuMatch++;
        }
    }

    console.log("Total TANPATSU:", tanpatsuMatch)
}
main()
