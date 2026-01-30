
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function checkSchema() {
    console.log('Checking membership_type_lessons...')
    const { data, error } = await supabase
        .from('membership_type_lessons')
        .select(`
        *,
        lesson_masters (name)
    `)
        .limit(5)

    if (error) console.error(error)
    else console.table(data)
}

checkSchema()
