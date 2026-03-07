import { fetchPaymentDashboardData } from '@/actions/payments'
import { PaymentManagementDashboard } from '@/components/admin/payments/PaymentManagementDashboard'
import { CardTitle, CardDescription } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function PaymentsPage({ searchParams }: { searchParams: { month?: string } }) {
    // デフォルトは当月
    const today = new Date()
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const month = searchParams.month || currentMonth

    const data = await fetchPaymentDashboardData(month)

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="text-2xl font-bold">決済状況管理</CardTitle>
                    <CardDescription>リアルタイムな決済状況とエラー件数の確認</CardDescription>
                </div>
            </div>

            <PaymentManagementDashboard initialData={data} />
        </div>
    )
}
