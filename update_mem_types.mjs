import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    console.log("Updating '25m完泳パッケージプラン【全12回】' to be a proper package plan...")
    
    const { data, error } = await supabase
        .from('membership_types')
        .update({
            is_package: true,
            ticket_count: 12,
            fee: 102000,
            stripe_price_id: 'price_1SwKVfP0UQGtpYXm9cgy3v1g' // 本番用価格ID（stripe_enrollmentでマッピングされる対象）
        })
        .eq('id', '253598b8-7e11-463c-af47-5d19097b3589')
        .select()

    if (error) {
        console.error("Update error:", error)
        return
    }

    console.log("Updated Plan Data:", data)
}
main()
