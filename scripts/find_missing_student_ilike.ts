
import { createAdminClient } from '@/lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function findStudent() {
    const supabase = createAdminClient()
    const email = 'shinshin980312kodai@gmail.com'

    // Check Students ILIKE
    const { data: students } = await supabase
        .from('students')
        .select('*')
        .ilike('contact_email', email)

    console.log('Students found (ILIKE):', students?.length, students)
}

findStudent()
