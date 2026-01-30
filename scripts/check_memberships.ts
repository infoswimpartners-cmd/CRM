
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function checkMemberships() {
    console.log('Checking Membership Types and Lessons...')
    const { data: memberships, error } = await supabase
        .from('membership_types')
        .select(`
      id, 
      name, 
      default_lesson_master_id,
      lesson_masters:default_lesson_master_id (name)
    `)

    if (error) {
        console.error('Error:', error)
        return
    }

    console.table(memberships.map(m => {
        const lm = m.lesson_masters as any
        const lessonName = Array.isArray(lm) ? lm[0]?.name : lm?.name
        return {
            id: m.id,
            name: m.name,
            default_lesson: lessonName || 'NULL',
            default_id: m.default_lesson_master_id
        }
    }))

    // Find '単発' type ID
    const singleType = memberships.find(m => m.name.includes('単発'))
    if (singleType) {
        console.log(`\nFinding student with membership: ${singleType.name} (${singleType.id})`)
        const { data: students } = await supabase
            .from('profiles') // Assuming 'students' table is actually 'profiles' with role 'student'
            .select('id, full_name')
            .eq('membership_type_id', singleType.id)
            .limit(5)

        console.table(students)
    } else {
        console.log('No Single type found')
    }

    // Also check a few students to see if they have membership_id
    const { data: students } = await supabase
        .from('profiles')
        .select('full_name, membership_type_id')
        .eq('role', 'student')
        .limit(5)

    console.log('\nSample Students:')
    console.table(students)
}

checkMemberships()
