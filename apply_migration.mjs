import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260622100000_add_membership_change_rules.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    console.log("Applying migration...")

    const { data, error } = await supabase.rpc('execute_sql', { sql })

    if (error) {
        console.error("Migration error:", error)
        console.log("Attempting fallback using direct SQL execution if possible...")
    } else {
        console.log("Migration applied successfully!")
    }
}
main()
