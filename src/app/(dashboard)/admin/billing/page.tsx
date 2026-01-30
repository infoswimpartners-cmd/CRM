
import { createClient } from '@/lib/supabase/server'
import { BillingApprovalList } from '@/components/admin/BillingApprovalList'
import { FileCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function BillingApprovalPage() {
    const supabase = await createClient()

    const { data: schedules } = await supabase
        .from('lesson_schedules')
        .select(`
            id, start_time, title, price,
            student:students (
                full_name,
                second_student_name
            ),
            lesson_master:lesson_masters (
                name
            )
        `)
        .eq('billing_status', 'awaiting_approval')
        .order('start_time', { ascending: true })

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-orange-400 to-amber-600 rounded-xl shadow-lg shrink-0">
                    <FileCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">請求承認管理</h1>
                    <p className="text-slate-500 font-medium">過不足金などの追加請求承認</p>
                </div>
            </div>

            <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-white/40 text-sm text-slate-600 leading-relaxed shadow-sm">
                <p>
                    <span className="font-bold text-orange-600">⚠ 注意事項:</span><br />
                    以下のレッスンは、月規定回数超過などの理由で追加請求が発生しています。<br />
                    内容を確認し、承認を行ってください。承認後、所定の期日（レッスン前日昼など）に自動的にStripeにて請求処理（Invoice Item作成）が実行されます。
                </p>
            </div>

            <BillingApprovalList schedules={schedules as any || []} />
        </div>
    )
}
