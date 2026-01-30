
import { createAdminClient } from '@/lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkLatestSchedule() {
    const supabase = createAdminClient()

    const { data: schedule, error } = await supabase
        .from('lesson_schedules')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (error) {
        console.error('Error fetching schedule:', error)
        return
    }

    console.log('Latest Schedule:', {
        id: schedule.id,
        title: schedule.title,
        start_time: schedule.start_time,
        is_overage: schedule.is_overage,
        billing_status: schedule.billing_status,
        billing_scheduled_at: schedule.billing_scheduled_at,
        notification_sent_at: schedule.notification_sent_at,
        student_id: schedule.student_id
    })

    // Fetch student email to verify
    const { data: student } = await supabase
        .from('students')
        .select('contact_email, full_name, membership_types(name)')
        .eq('id', schedule.student_id)
        .single()

    console.log('Student Info:', student)
}

checkLatestSchedule()
