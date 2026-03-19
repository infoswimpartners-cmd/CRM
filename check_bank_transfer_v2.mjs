import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const { data, error } = await supabase
        .from('students')
        .select('full_name, is_bank_transfer, stripe_customer_id, stripe_subscription_id')
        .eq('is_bank_transfer', true)

    if (error) {
        console.error(error)
        return
    }

    console.log("Students with Bank Transfer = true:")
    console.log(data)
}
main()
