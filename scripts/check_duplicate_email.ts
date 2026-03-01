import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkDuplicateEmail() {
    const email = 'shinshin980312kodai@gmail.com'
    const { data: students, error } = await supabaseAdmin
        .from('students')
        .select('id, full_name, line_user_id, contact_email')
        .ilike('contact_email', email)

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('Students with this email:', JSON.stringify(students, null, 2))
}

checkDuplicateEmail()
