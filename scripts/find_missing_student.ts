
import { createAdminClient } from '@/lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function findStudent() {
    const supabase = createAdminClient()
    const email = 'shinshin980312kodai@gmail.com'

    // Check Students
    const { data: students } = await supabase.from('students').select('*').eq('contact_email', email)
    console.log('Students found:', students?.length, students)

    // List all tables (hacky way or just guess)
    // We can't list tables easily via client.
}

findStudent()
