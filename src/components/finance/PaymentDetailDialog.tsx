
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Printer } from "lucide-react"

// Import type (assuming it is exported or defining compatible interface)
export interface MonthlyRewardStats {
    month: string
    baseAmount: number
    consumptionTax: number
    withholdingTax: number
    systemFee: number
    transferFee: number
    finalAmount: number
    paymentDate: string
    isInvoiceRegistered?: boolean // Optional in API but used here
    invoiceRegistered?: boolean // API return
    id?: string // API might not return ID for generated stats, use month key
    status?: 'paid' | 'processing'
    details: {
        date: string
        title: string
        studentName: string
        price: number
        reward: number
    }[]
}

interface PaymentDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    payment: MonthlyRewardStats | null
    coachName: string
    companyInfo: any // Record<string, string>
    bankInfo: any // { bank_name: string, ... }
}

export function PaymentDetailDialog({ open, onOpenChange, payment, coachName, companyInfo, bankInfo }: PaymentDetailDialogProps) {
    if (!payment) return null

    // Fallback if APIs fail
    // Fallback if APIs fail
    // Use provided info or empty object
    const cInfo = companyInfo || {}

    const bInfo = bankInfo || {}

    // Use values from payment object
    const isInvoice = payment.invoiceRegistered ?? payment.isInvoiceRegistered ?? false
    const isPaid = payment.status === 'paid'

    const numberFont = { fontFamily: '"MS Mincho", "Hiragino Mincho ProN", serif' }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-white text-slate-900 max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b border-slate-100 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            支払通知書
                            <span className="text-sm font-normal text-slate-500 ml-2" style={numberFont}>({payment.month})</span>
                        </DialogTitle>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isPaid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                            {isPaid ? '支払完了' : '処理中'}
                        </div>
                    </div>
                    <DialogDescription>
                        {isPaid ? '以下の内容で振込手続が完了いたしました。' : '以下の内容で支払手続きを進めております。'}
                    </DialogDescription>
                </DialogHeader>

                {/* 書類本体エリア - 印刷用スタイルを意識 */}
                <div className="p-6 border border-slate-200 rounded-lg bg-slate-50/50 space-y-8 font-serif" id="payment-notice-print">

                    {/* Header Info */}
                    <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6">
                        <div>
                            <h2 className="text-2xl font-bold border-b border-slate-400 inline-block pb-1 mb-2">
                                {coachName} 様
                            </h2>
                            <p className="text-slate-600 mt-2">下記の通り、報酬をお{isPaid ? '支払いいたします' : '支払いする予定です'}。</p>
                        </div>
                        <div className="text-right text-sm text-slate-600 space-y-1">
                            <p><span className="font-semibold">発行日:</span> <span style={numberFont}>{payment.paymentDate}</span></p>
                            {/* Use month as ID if ID is missing */}
                            <p><span className="font-semibold">No:</span> <span style={numberFont}>{payment.id || payment.month.replace(/[^0-9]/g, '')}</span></p>
                            <p><span className="font-semibold">状態:</span> {isPaid ? '支払済' : '未払'}</p>
                        </div>
                    </div>

                    {/* Main Amount */}
                    <div className="bg-white p-4 border border-slate-200 rounded-lg text-center">
                        <p className="text-sm text-slate-500 mb-1">支払金額合計 (手取り額)</p>
                        <p className="text-4xl font-bold text-slate-900" style={numberFont}>
                            ¥{payment.finalAmount.toLocaleString()}
                        </p>
                    </div>

                    {/* Payment Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <p className="font-semibold text-slate-700">【振込先情報】</p>
                            <p>支払予定日: <span style={numberFont}>{payment.paymentDate}</span></p>
                            {bInfo.bank_name ? (
                                <p>振込先: {bInfo.bank_name} {bInfo.branch_name} {bInfo.account_type} <span style={numberFont}>{bInfo.account_number}</span> <br /> {bInfo.account_holder_name}</p>
                            ) : (
                                <p className="text-red-500">※振込先口座情報が未登録です</p>
                            )}
                        </div>
                    </div>

                    {/* Details Table */}
                    <div>
                        <p className="font-semibold text-slate-700 mb-2">【内訳詳細】</p>
                        <table className="w-full text-sm border-collapse tabular-nums">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                                    <th className="py-2 font-medium">日付</th>
                                    <th className="py-2 font-medium">レッスン</th>
                                    <th className="py-2 font-medium">生徒氏名</th>
                                    <th className="py-2 text-right font-medium">金額</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payment.details.map((detail, i) => (
                                    <tr key={i} className="border-b border-slate-100 last:border-0">
                                        <td className="py-2 text-slate-600" style={numberFont}>{detail.date}</td>
                                        <td className="py-2 text-slate-900">{detail.title}</td>
                                        <td className="py-2 text-slate-600">{detail.studentName}</td>
                                        <td className="py-2 text-right font-medium" style={numberFont}>¥{detail.reward.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Summary & Tax Breakdown - New Section for Admin Dialog */}
                        <div className="mt-8 grid grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-semibold text-slate-700 mb-2">税率別内訳</h4>
                                <table className="w-full text-sm text-left border-collapse border border-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="border border-slate-200 px-2 py-1">区分</th>
                                            <th className="border border-slate-200 px-2 py-1 text-right">対象額</th>
                                            <th className="border border-slate-200 px-2 py-1 text-right">税額</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-slate-200 px-2 py-1"><span style={numberFont}>10%</span>対象</td>
                                            <td className="border border-slate-200 px-2 py-1 text-right" style={numberFont}>¥{payment.baseAmount?.toLocaleString()}</td>
                                            <td className="border border-slate-200 px-2 py-1 text-right" style={numberFont}>¥{payment.consumptionTax.toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-700 mb-2">支払金額計算</h4>
                                <table className="w-full text-sm border-collapse tabular-nums">
                                    <tbody>
                                        <tr className="border-b border-slate-200">
                                            <td className="py-2 text-slate-600">小計</td>
                                            <td className="py-2 text-right font-medium" style={numberFont}>¥{(payment.baseAmount + payment.consumptionTax).toLocaleString()}</td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                            <td className="py-2 text-slate-600">源泉所得税</td>
                                            <td className="py-2 text-right text-red-600 font-medium" style={numberFont}>▲¥{payment.withholdingTax.toLocaleString()}</td>
                                        </tr>
                                        <tr className="border-t-2 border-slate-800">
                                            <td className="py-2 font-bold text-slate-900">合計</td>
                                            <td className="py-2 text-right font-bold text-lg" style={numberFont}>¥{payment.finalAmount.toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Check Logic Formula Display for transparency */}
                        <div className="mt-4 text-xs text-slate-400 text-right">
                            合計 = 小計 - 源泉徴収
                        </div>
                    </div>

                    {/* Footer / Issuer */}
                    <div className="border-t-2 border-slate-200 pt-6 mt-8">
                        <div className="flex justify-end">
                            <div className="text-right text-sm text-slate-600 space-y-1">
                                <p className="font-bold text-base text-slate-800">{cInfo.company_name || 'SWIM PARTNERS'}</p>
                                {cInfo.invoice_registration_number && (
                                    <p>登録番号：{cInfo.invoice_registration_number}</p>
                                )}
                                {cInfo.company_address && (
                                    <p>住所：{cInfo.company_address}</p>
                                )}
                                {cInfo.contact_email && (
                                    <p>連絡先：{cInfo.contact_email}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-4">
                    <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                        <Printer className="h-4 w-4" />
                        印刷
                    </Button>
                    <Button className="gap-2 bg-cyan-600 hover:bg-cyan-700 text-white">
                        <Download className="h-4 w-4" />
                        PDFダウンロード
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}


