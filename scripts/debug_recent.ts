
import { createAdminClient } from '@/lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function debugRecent() {
    const supabase = createAdminClient()

    const { data: schedules } = await supabase
        .from('lesson_schedules')
        .select(`
        id, created_at, title, start_time, is_overage, billing_status,
        student_id,
        students!lesson_schedules_student_id_fkey (
            full_name,
            contact_email,
            membership_types!students_membership_type_id_fkey (
                name, monthly_lesson_limit
            )
        )
    `)
        .order('created_at', { ascending: false })
        .limit(3)

    console.log('Recent Schedules:')
    if (schedules) {
        schedules.forEach(s => {
            console.log(`\n[${s.created_at}] ${s.title}`)
            console.log(`  Start: ${s.start_time}`)
            console.log(`  Overage: ${s.is_overage} | Status: ${s.billing_status}`)
            // @ts-ignore
            const studentData = s.students
            const student = Array.isArray(studentData) ? studentData[0] : studentData
            if (student) {
                console.log(`  Student: ${student.full_name}`)
                // @ts-ignore
                const mData = student.membership_types
                const m = Array.isArray(mData) ? mData[0] : mData
                console.log(`  Membership: ${m ? m.name : 'None'} (Limit: ${m ? m.monthly_lesson_limit : '?'})`)
            } else {
                console.log('  Student: Not Found (or relation mismatched)')
            }
        })
    }
}

debugRecent()
