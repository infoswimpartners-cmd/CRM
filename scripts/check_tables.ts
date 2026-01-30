
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function listTables() {
    console.log('Listing tables...')
    // Not easy to list tables via JS client without raw SQL access or info schema query which might be blocked?
    // Let's try to select from a few candidates blindly

    const tables = ['students', 'profiles', 'users', 'memberships']
    for (const t of tables) {
        const { data, error } = await supabase.from(t).select('*').limit(1)
        if (error) console.log(`${t}: Error - ${error.message}`)
        else console.log(`${t}: OK - ${data.length} rows`)
    }

    // Check columns of 'students' if it works
    const { data: student, error } = await supabase.from('students').select('*').limit(1)
    if (student && student.length > 0) {
        console.log('Students columns:', Object.keys(student[0]))
    }
}

listTables()
