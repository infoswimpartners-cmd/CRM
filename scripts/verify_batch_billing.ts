
import { createAdminClient } from '../src/lib/supabase/admin'

async function checkPending() {
    const supabase = createAdminClient()
    const { data: schedules, error } = await supabase
        .from('lesson_schedules')
        .select(`
            id,
            student_id,
            billing_status,
            student:students (
                id,
                full_name,
                stripe_customer_id,
                stripe_subscription_id
            )
        `)
        .eq('billing_status', 'ready_to_invoice')

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log(`Found ${schedules?.length || 0} ready_to_invoice items.`)
    
    const singleMembers = schedules?.filter((s: any) => !s.student?.stripe_subscription_id) || []
    console.log(`Of which ${singleMembers.length} are single members (no sub).`)
    
    singleMembers.forEach((s: any) => {
        console.log(`- Student: ${s.student?.full_name}, ID: ${s.id}`)
    })
}

checkPending()
