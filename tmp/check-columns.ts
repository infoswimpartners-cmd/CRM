import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function check() {
    console.log("Checking columns of 'lessons' table...")
    const { data, error } = await supabase.from('lessons').select('*').limit(1)
    if (error) {
        console.error("Error fetching lessons:", error)
        return
    }
    if (data && data.length > 0) {
        console.log("Columns:", Object.keys(data[0]))
    } else {
        console.log("No data found, trying to insert an empty row to see error...")
    }
}

check()
