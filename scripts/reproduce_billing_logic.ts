
import { createAdminClient } from '@/lib/supabase/admin'
import { startOfMonth, endOfMonth } from 'date-fns'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function simulateLogic(studentId: string, dateStr: string) {
    console.log(`Simulating for Student: ${studentId}, Date: ${dateStr}`)
    const supabaseAdmin = createAdminClient()
    const date = new Date(dateStr)

    const { data: student, error } = await supabaseAdmin
        .from('students')
        .select(`
            id, membership_type_id,
            membership_types (
                monthly_lesson_limit,
                fee,
                name
            )
        `)
        .eq('id', studentId)
        .single()

    if (error || !student) {
        console.error('Student fetch failed:', error)
        return
    }

    // @ts-ignore
    const membership = Array.isArray(student.membership_types) ? student.membership_types[0] : student.membership_types
    const limit = membership?.monthly_lesson_limit
    const membershipName = membership?.name

    console.log(`Membership: ${membershipName}, Limit: ${limit}`)

    let checkOverage = false

    // Logic being tested
    if (membershipName?.includes('単発')) {
        console.log('Detected Single Plan -> Overage True')
        checkOverage = true
    } else if (limit > 0) {
        console.log('Checking Limit...')
        const start = startOfMonth(date).toISOString()
        const end = endOfMonth(date).toISOString()

        const { count: completedCount } = await supabaseAdmin
            .from('lessons')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', studentId)
            .gte('lesson_date', start)
            .lte('lesson_date', end)

        const { count: scheduledCount } = await supabaseAdmin
            .from('lesson_schedules')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', studentId)
            .gte('start_time', start)
            .lte('start_time', end)

        const currentTotal = (completedCount || 0) + (scheduledCount || 0)
        console.log(`Current Total: ${currentTotal}, Limit: ${limit}`)

        if (currentTotal >= limit) {
            console.log('Limit Reached -> Overage True')
            checkOverage = true
        } else {
            console.log('Limit NOT Reached -> Overage False')
        }
    }

    console.log('Final checkOverage:', checkOverage)
}

// Run for the student in question
simulateLogic('084a8854-86be-410b-b2fc-38d05e1389c6', '2026-01-27T01:00:00+00:00')
