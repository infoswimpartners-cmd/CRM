'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, FileText, CheckCircle, Clock } from "lucide-react"
import { PaymentDetailDialog } from "./PaymentDetailDialog"

export function PaymentHistory() {
    const [selectedPayment, setSelectedPayment] = useState<any>(null)
    const [detailOpen, setDetailOpen] = useState(false)

    // Mock data with extended fields for detail view
    // baseAmount = 税抜金額
    const payments = [
        { id: '2023-12', month: '2023年12月分', amount: 142000, status: 'paid', date: '2024/01/25', baseAmount: 160000, isInvoiceRegistered: true },
        { id: '2023-11', month: '2023年11月分', amount: 138000, status: 'paid', date: '2023/12/25', baseAmount: 155000, isInvoiceRegistered: true },
        { id: '2023-10', month: '2023年10月分', amount: 125000, status: 'paid', date: '2023/11/25', baseAmount: 140000, isInvoiceRegistered: false }, // 免税例
        { id: '2023-09', month: '2023年9月分', amount: 110000, status: 'paid', date: '2023/10/25', baseAmount: 125000, isInvoiceRegistered: false },
    ]

    const handleOpenDetail = (payment: any) => {
        setSelectedPayment(payment)
        setDetailOpen(true)
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
                            {payments.map((payment) => (
                                <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        {payment.month}
                                    </td>
                                    <td className="px-6 py-4 text-slate-700 font-semibold">
                                        ¥{payment.amount.toLocaleString()}
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
                                        {payment.date}
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
                coachName="山田 太郎" // Mock current user name
            />
        </>
    )
}
