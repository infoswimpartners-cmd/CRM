import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    console.log("Checking DB for Webhook logs...")
    const { data, error } = await supabase.from('students').select('created_at, full_name, notes, status, contact_email').order('created_at', { ascending: false }).limit(20)
    if (error) {
        console.error("DB Error:", error)
        return
    }
    console.log("Recent students/logs (Latest 20):")
    data.forEach(d => {
        console.log(`[${d.created_at}] ${d.full_name} (${d.contact_email}) - Status: ${d.status}`)
        if (d.notes) {
            console.log(`  > Notes: ${d.notes.substring(0, 150)}...`)
        }
    })
}
main()
