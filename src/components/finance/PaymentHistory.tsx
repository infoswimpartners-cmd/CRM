
'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, FileText, CheckCircle, Clock, Loader2 } from "lucide-react"
import { PaymentDetailDialog, MonthlyRewardStats } from "./PaymentDetailDialog"
import { createClient } from '@/lib/supabase/client'

export function PaymentHistory() {
    const [payments, setPayments] = useState<MonthlyRewardStats[]>([])
    const [selectedPayment, setSelectedPayment] = useState<MonthlyRewardStats | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const [companyInfo, setCompanyInfo] = useState<any>(null)
    const [bankInfo, setBankInfo] = useState<any>(null)
    const [userName, setUserName] = useState('')

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()

                if (user) {
                    const { data: profile } = await supabase.from('profiles').select('full_name, id').eq('id', user.id).single()
                    setUserName(profile?.full_name || '')

                    // Fetch Bank Info from settings API (configured for self-fetch)
                    const bankRes = await fetch('/api/settings/bank')
                    if (bankRes.ok) {
                        const bankData = await bankRes.json()
                        setBankInfo(bankData)
                    }
                }

                // Fetch Payments
                const payRes = await fetch('/api/teacher/payments')
                if (payRes.ok) {
                    const payData = await payRes.json()
                    // Filter out future months or empty processing data if needed, 
                    // but logic in API already handles 12 months lookback.
                    // Let's filter to show only if there is activity? 
                    // API returns even if totalReward is 0 if it's in the loop? 
                    // API logic: "if (monthLessons.length === 0 && i > 0) continue"
                    // So it should be fine.
                    setPayments(payData)
                }

                // Fetch Company Info
                const companyRes = await fetch('/api/admin/settings/company')
                if (companyRes.ok) {
                    const companyData = await companyRes.json()
                    setCompanyInfo(companyData)
                }

            } catch (error) {
                console.error('Error fetching payment history:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    const handleOpenDetail = (payment: MonthlyRewardStats) => {
        setSelectedPayment(payment)
        setDetailOpen(true)
    }

    if (loading) {
        return <div className="p-8 text-center text-slate-500"><Loader2 className="animate-spin h-6 w-6 mx-auto mb-2" />読み込み中...</div>
    }

    return (
        <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">支払い通知書一覧</h3>
                    <Button variant="outline" size="sm" className="bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100">
                        <Download className="h-4 w-4 mr-2" />
                        すべてダウンロード
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left tabular-nums">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">対象月</th>
                                <th className="px-6 py-4">支払金額 (手取り)</th>
                                <th className="px-6 py-4">ステータス</th>
                                <th className="px-6 py-4">支払日</th>
                                <th className="px-6 py-4 text-right">アクション</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                        支払い履歴がありません
                                    </td>
                                </tr>
                            ) : payments.map((payment) => (
                                <tr key={payment.month} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        {payment.month}
                                    </td>
                                    <td className="px-6 py-4 text-slate-700 font-semibold">
                                        ¥{payment.finalAmount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5">
                                            {payment.status === 'paid' ? (
                                                <>
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                    <span className="text-green-600 font-medium">支払完了</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Clock className="h-4 w-4 text-orange-500" />
                                                    <span className="text-orange-600 font-medium">処理中</span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {payment.paymentDate}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                                            onClick={() => handleOpenDetail(payment)}
                                        >
                                            <FileText className="h-4 w-4 mr-2" />
                                            通知書詳細
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <PaymentDetailDialog
                open={detailOpen}
                onOpenChange={setDetailOpen}
                payment={selectedPayment}
                coachName={userName}
                companyInfo={companyInfo}
                bankInfo={bankInfo}
            />
        </>
    )
}


