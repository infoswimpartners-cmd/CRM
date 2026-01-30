import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function findStudent() {
    console.log('Searching for student 0024 / 新吉航大テスト...')

    // Try finding by student_number if it exists, or name
    // The schema has 'student_number' (text)? Not sure, let's check basic columns first.
    // Schema in step 7062 showed 'student_number' in page.tsx fetch? 
    // Wait, page.tsx:113: `student.student_number || '未設定'`. So it exists.

    // Search by name first as it's more reliable if ID format varies
    const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .ilike('full_name', '%新吉航大テスト%')

    if (error) {
        console.error(error)
        return
    }

    if (students && students.length > 0) {
        console.log('Found Student(s):')
        students.forEach(s => {
            console.log(`- ID: ${s.id}`)
            console.log(`  Name: ${s.full_name}`)
            console.log(`  Student Number: ${s.student_number}`)
            console.log(`  Email: ${s.contact_email}`)
            console.log(`  Status: ${s.status}`)
            console.log(`  Stripe Customer: ${s.stripe_customer_id}`)
        })
    } else {
        console.log('No student found matching that name. Searching by ALL contents...')
    }
}

findStudent()
