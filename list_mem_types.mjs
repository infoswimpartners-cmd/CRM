import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const { data, error } = await supabase
        .from('membership_types')
        .select('*')

    if (error) {
        console.error(error)
        return
    }

    console.log("All Membership Types:")
    for (const t of data) {
        console.log(`${t.id} | ${t.name} | fee=${t.fee} | stripe_price=${t.stripe_price_id} | active=${t.active} | is_package=${t.is_package} | ticket_count=${t.ticket_count}`)
    }
}
main()
