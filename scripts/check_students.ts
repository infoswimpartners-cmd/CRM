import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkSpecificStudent() {
    const email = 'shinworking980312@gmail.com'
    const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('contact_email', email)

    if (error) {
        console.error('Error:', error)
        return
    }

    if (students && students.length > 0) {
        console.log(`Found ${students.length} record(s) for ${email}:`)
        students.forEach(s => {
            console.log(`- ID: ${s.id}, Name: ${s.full_name}, Status: ${s.status}`)
        })
    } else {
        console.log(`No records found for ${email}`)
    }
}

checkSpecificStudent()
