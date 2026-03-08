import { createAdminClient } from '../src/lib/supabase/admin'
import { approveLessonSchedule } from '../src/actions/lesson_schedule'
import { createLessonSchedule } from '../src/actions/lesson_schedule'

async function runTest() {
    const supabase = createAdminClient()

    // 1. Fetch an existing active student with stripe ID
    const { data: student } = await supabase
        .from('students')
        .select('id, stripe_customer_id, membership_type_id, status')
        .eq('status', 'active')
        .not('stripe_customer_id', 'is', null)
        .limit(1)
        .single()

    if (!student) {
        console.log('No active student found for test.')
        return
    }

    // 2. Fetch a coach
    const { data: coach } = await supabase.from('profiles').select('id').eq('role', 'coach').limit(1).single()

    // 3. Create a schedule
    const startTime = new Date()
    startTime.setDate(startTime.getDate() + 2) // In 2 days
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)

    console.log(`\n--- Testing Plan A Billing Workflow ---`)
    console.log(`Student ID: ${student.id}`)
    console.log(`Stripe ID: ${student.stripe_customer_id}`)
    console.log(`Membership: ${student.membership_type_id ? 'Yes' : 'No'}`)

    const createRes = await createLessonSchedule({
        coach_id: coach.id,
        student_id: student.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        title: '決済テストレッスン (Billing Workflow)',
        notes: 'Testing billing'
    })

    if (!createRes.success) {
        console.error('Failed to create schedule:', createRes.error)
        return
    }

    const scheduleId = createRes.data.id
    console.log(`\n✅ Created Schedule: ${scheduleId}`)
    console.log(`Is Overage: ${createRes.isOverage}`)

    // 4. Test normal approval (Auto charge or Defer)
    console.log(`\n[Test 1] Normal Approval (Should be Deferred or Auto-Charged based on student plan)`)
    const approveRes1 = await approveLessonSchedule(scheduleId)
    console.log('Result:', approveRes1)

}

runTest()
