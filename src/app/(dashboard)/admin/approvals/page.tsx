
import { createAdminClient } from '@/lib/supabase/admin'
import { BillingApprovalList } from '@/components/admin/BillingApprovalList'
import { CheckSquare } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ApprovalsPage() {
    const supabase = createAdminClient()

    // 1. Fetch Billing Approvals (Unpaid / Awaiting Approval)
    // Reusing logic from billing page
    const { data: unpaidSchedules } = await supabase
        .from('lesson_schedules')
        .select(`
            id, start_time, title, price, billing_status, stripe_invoice_item_id,
            student:students (
                full_name,
                second_student_name
            )
        `)
        .in('billing_status', ['awaiting_payment', 'awaiting_approval', 'error', 'pending', 'approved'])
        .order('start_time', { ascending: true })

    // 2. Paid Schedules (History) - for Billing List component compatibility
    const { data: paidSchedules } = await supabase
        .from('lesson_schedules')
        .select(`
            id, start_time, title, price, billing_status, status, stripe_invoice_item_id,
            student:students (
                full_name,
                second_student_name
            ),
            lesson_master:lesson_masters!inner (
                name,
                is_trial
            )
        `)
        .in('billing_status', ['paid', 'refunded', 'partially_refunded'])
        .eq('lesson_master.is_trial', true)
        .order('start_time', { ascending: false })
        .limit(20)

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <CheckSquare className="h-8 w-8 text-cyan-600" />
                承認管理
            </h1>

            <BillingApprovalList
                unpaidSchedules={unpaidSchedules as any || []}
                paidSchedules={paidSchedules as any || []}
            />
        </div>
    )
}
