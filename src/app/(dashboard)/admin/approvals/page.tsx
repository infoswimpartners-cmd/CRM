
import { createAdminClient } from '@/lib/supabase/admin'
import { BillingApprovalList } from '@/components/admin/BillingApprovalList'
import { ReceptionApprovalList } from '@/components/admin/ReceptionApprovalList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckSquare, AlertCircle, Mail, CreditCard } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function ApprovalsPage() {
    const supabase = createAdminClient()

    // 1. Fetch Reception Approvals (Inquiry Only - 'trial_pending' handled elsewhere or considered done for this queue)
    const { data: receptionStudents } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'inquiry') // changed from .in(['inquiry', 'trial_pending'])
        .order('created_at', { ascending: false })

    // 2. Fetch Billing Approvals (Unpaid / Awaiting Approval)
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

    // 3. Paid Schedules (History) - for Billing List component compatibility
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
        .limit(20)

    const receptionCount = receptionStudents?.length || 0
    const billingCount = unpaidSchedules?.filter((s: any) => s.billing_status === 'awaiting_approval').length || 0

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <CheckSquare className="h-8 w-8 text-cyan-600" />
                承認管理
            </h1>

            <Tabs defaultValue="reception" className="w-full">
                <TabsList className="grid w-full max-w-[600px] grid-cols-2">
                    <TabsTrigger value="reception" className="data-[state=active]:bg-white data-[state=active]:text-cyan-600 data-[state=active]:shadow-sm">
                        <Mail className="h-4 w-4 mr-2" />
                        申込承認
                        {receptionCount > 0 && (
                            <span className="ml-2 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full font-bold">
                                {receptionCount}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="billing" className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm">
                        <CreditCard className="h-4 w-4 mr-2" />
                        請求承認
                        {billingCount > 0 && (
                            <span className="ml-2 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full font-bold">
                                {billingCount}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="reception" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>申込承認待ち一覧</CardTitle>
                            <CardDescription>
                                Webサイトからの問い合わせや体験申込を確認し、受付メールを送信してください。
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ReceptionApprovalList students={receptionStudents || []} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="billing" className="mt-6">
                    <BillingApprovalList
                        unpaidSchedules={unpaidSchedules as any || []}
                        paidSchedules={paidSchedules as any || []}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
