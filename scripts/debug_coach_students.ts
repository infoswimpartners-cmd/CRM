
import { createAdminClient } from '@/lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function debugCoachStudents() {
    const supabase = createAdminClient()

    // 1. List all coaches
    const { data: coaches, error: coachError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'coach')

    if (coachError) {
        console.error('Coach Error:', coachError)
        return
    }

    console.log(`Found ${coaches?.length} coaches.`)

    for (const coach of coaches || []) {
        console.log(`\nChecking Coach: ${coach.full_name} (${coach.id})`)

        const { data: students, error: studentError } = await supabase
            .from('students')
            .select(`
                id,
                full_name,
                status,
                coach_id,
                membership_types:membership_type_id (
                    default_lesson_master_id,
                    name
                )
            `)
            .eq('coach_id', coach.id)

        if (studentError) {
            console.error('  Student Query Error:', studentError)
        } else {
            console.log(`  Found ${students?.length} students.`)
            if (students && students.length > 0) {
                students.forEach(s => {
                    // @ts-ignore
                    const mName = Array.isArray(s.membership_types) ? s.membership_types[0]?.name : s.membership_types?.name
                    console.log(`    - ${s.full_name} (Status: ${s.status}, Membership: ${mName})`)
                })
            }
        }
    }
}

debugCoachStudents()
