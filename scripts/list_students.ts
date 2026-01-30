
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function listStudents() {
    console.log('Listing profiles...')
    const { data: profiles, error } = await supabase
        .from('students')
        .select('id, full_name, membership_type_id')
        .limit(10)

    if (error) console.error(error)
    else console.table(profiles)
}

listStudents()
