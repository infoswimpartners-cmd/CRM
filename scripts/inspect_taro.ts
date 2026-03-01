import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function inspectStudent() {
    const { data: students, error } = await supabaseAdmin
        .from('students')
        .select('*')
        .ilike('full_name', '%太郎%')

    if (error) {
        console.error('Error fetching students:', error)
        return
    }

    console.log('Students found:', JSON.stringify(students, null, 2))
}

inspectStudent()
