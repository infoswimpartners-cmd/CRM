
import { createAdminClient } from '@/lib/supabase/admin'
import { BillingApprovalList } from '@/components/admin/BillingApprovalList'
import { FileCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function BillingApprovalPage() {
    const supabase = createAdminClient()

    // 1. Unpaid Schedules (Awaiting Payment or Error)
    const { data: unpaidSchedules } = await supabase
        .from('lesson_schedules')
        .select(`
            id, start_time, title, price, billing_status, stripe_invoice_item_id,
            student:students (
                full_name,
                second_student_name
            )
        `)
        .in('billing_status', ['awaiting_payment', 'awaiting_approval', 'error', 'pending', 'approved']) // Include approval pending & approved (future)
        .order('start_time', { ascending: true })

    console.log('[BillingPage] Fetched Unpaid Schedules:', unpaidSchedules ? unpaidSchedules.length : 'null')
    if (unpaidSchedules && unpaidSchedules.length > 0) {
        console.log('[BillingPage] Sample Status:', unpaidSchedules[0].billing_status)
    }

    // 2. Paid / Refunded Schedules (History)
    const { data: paidSchedules } = await supabase
        .from('lesson_schedules')
        .select(`
            id, start_time, title, price, billing_status, status, stripe_invoice_item_id,
            student:students (
                full_name,
                second_student_name
            ),
            lesson_master:lesson_masters (
                name
            )
        `)
        .in('billing_status', ['paid', 'refunded', 'partially_refunded'])
        .order('start_time', { ascending: false })
        .limit(50)

    return (
        <div className="space-y-6">
            <BillingApprovalList
                unpaidSchedules={unpaidSchedules as any || []}
                paidSchedules={paidSchedules as any || []}
            />
        </div>
    )
}
