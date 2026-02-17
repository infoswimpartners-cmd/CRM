
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
    templateConfig?: {
        payment_slip_title?: string
        payment_slip_header_paid?: string
        payment_slip_header_processing?: string
        payment_slip_footer?: string
    }
}

export function PaymentDetailDialog({ open, onOpenChange, payment, coachName, companyInfo, bankInfo, templateConfig }: PaymentDetailDialogProps) {
    if (!payment) return null

    // Fallback if APIs fail
    // Fallback if APIs fail
    // Use provided info or empty object
    const cInfo = companyInfo || {}

    const bInfo = bankInfo || {}

    // Use values from payment object
    const isInvoice = payment.invoiceRegistered ?? payment.isInvoiceRegistered ?? false
    const isPaid = payment.status === 'paid'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-white text-slate-900 max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b border-slate-100 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            {templateConfig?.payment_slip_title || '支払通知書'}
                            <span className="text-sm font-normal text-slate-500 ml-2">({payment.month})</span>
                        </DialogTitle>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isPaid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                            {isPaid ? '支払完了' : '処理中'}
                        </div>
                    </div>
                    <DialogDescription>
                        {isPaid
                            ? (templateConfig?.payment_slip_header_paid || '以下の内容で振込手続が完了いたしました。')
                            : (templateConfig?.payment_slip_header_processing || '以下の内容で支払手続きを進めております。')
                        }
                    </DialogDescription>
                </DialogHeader>

                {/* 書類本体エリア - 印刷用スタイルを意識 */}
                <div className="p-4 md:p-6 border border-slate-200 rounded-lg bg-slate-50/50 space-y-6 md:space-y-8" id="payment-notice-print">

                    {/* Header Info */}
                    <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-slate-200 pb-6 gap-4">
                        <div className="w-full md:w-auto">
                            <h2 className="text-xl md:text-2xl font-bold border-b border-slate-400 inline-block pb-1 mb-2">
                                {coachName} 様
                            </h2>
                            <p className="text-sm md:text-base text-slate-600 mt-2">下記の通り、報酬をお{isPaid ? '支払いいたします' : '支払いする予定です'}。</p>
                        </div>
                        <div className="w-full md:w-auto text-left md:text-right text-sm text-slate-600 space-y-1 bg-white md:bg-transparent p-3 md:p-0 rounded-lg border md:border-none border-slate-200">
                            <div className="flex justify-between md:block">
                                <span className="font-semibold md:hidden">発行日:</span>
                                <div><span className="hidden md:inline font-semibold">発行日:</span> <span>{payment.paymentDate}</span></div>
                            </div>
                            <div className="flex justify-between md:block">
                                <span className="font-semibold md:hidden">No:</span>
                                <div><span className="hidden md:inline font-semibold">No:</span> <span>{payment.id || payment.month.replace(/[^0-9]/g, '')}</span></div>
                            </div>
                            <div className="flex justify-between md:block">
                                <span className="font-semibold md:hidden">状態:</span>
                                <div><span className="hidden md:inline font-semibold">状態:</span> {isPaid ? '支払済' : '未払'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Main Amount */}
                    <div className="bg-white p-4 border border-slate-200 rounded-lg text-center shadow-sm">
                        <p className="text-xs md:text-sm text-slate-500 mb-1">支払金額合計 (手取り額)</p>
                        <p className="text-3xl md:text-4xl font-bold text-slate-900">
                            ¥{payment.finalAmount.toLocaleString()}
                        </p>
                    </div>

                    {/* Payment Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-white md:bg-transparent p-4 md:p-0 rounded-lg border md:border-none border-slate-200">
                        <div className="space-y-1">
                            <p className="font-semibold text-slate-700 mb-2 border-b md:border-none pb-1 md:pb-0">【振込先情報】</p>
                            <p>支払予定日: <span>{payment.paymentDate}</span></p>
                            {bInfo.bank_name ? (
                                <p>振込先: {bInfo.bank_name} {bInfo.branch_name} {bInfo.account_type} <span>{bInfo.account_number}</span> <br className="md:hidden" /> {bInfo.account_holder_name}</p>
                            ) : (
                                <p className="text-red-500">※振込先口座情報が未登録です</p>
                            )}
                        </div>
                    </div>

                    {/* Details Table */}
                    <div>
                        <p className="font-semibold text-slate-700 mb-2">【内訳詳細】</p>

                        {/* Desktop Table */}
                        <div className="hidden md:block">
                            <table className="w-full text-sm border-collapse tabular-nums">
                                <thead>
                                    <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                                        <th className="py-2 font-medium whitespace-nowrap">日付</th>
                                        <th className="py-2 font-medium">レッスン</th>
                                        <th className="py-2 font-medium">生徒氏名</th>
                                        <th className="py-2 text-right font-medium whitespace-nowrap">金額</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payment.details.map((detail, i) => (
                                        <tr key={i} className="border-b border-slate-100 last:border-0">
                                            <td className="py-2 text-slate-600">{detail.date}</td>
                                            <td className="py-2 text-slate-900">{detail.title}</td>
                                            <td className="py-2 text-slate-600">{detail.studentName}</td>
                                            <td className="py-2 text-right font-medium">¥{detail.reward.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile List */}
                        <div className="md:hidden space-y-3">
                            {payment.details.map((detail, i) => (
                                <div key={i} className="bg-white p-3 rounded-lg border border-slate-200 text-sm shadow-sm">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-slate-700">{detail.date}</span>
                                        <span className="font-bold text-slate-900">¥{detail.reward.toLocaleString()}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 mb-1">{detail.title}</div>
                                    <div className="text-xs text-slate-600 flex items-center gap-1">
                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded">生徒</span>
                                        {detail.studentName}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Summary & Tax Breakdown */}
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            <div className="bg-white md:bg-transparent p-4 md:p-0 rounded-lg border md:border-none border-slate-200">
                                <h4 className="font-semibold text-slate-700 mb-2">税率別内訳</h4>
                                <table className="w-full text-sm text-left border-collapse border border-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="border border-slate-200 px-2 py-1 whitespace-nowrap">区分</th>
                                            <th className="border border-slate-200 px-2 py-1 text-right whitespace-nowrap">対象額</th>
                                            <th className="border border-slate-200 px-2 py-1 text-right whitespace-nowrap">税額</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-slate-200 px-2 py-1 whitespace-nowrap">10%対象</td>
                                            <td className="border border-slate-200 px-2 py-1 text-right">¥{payment.baseAmount?.toLocaleString()}</td>
                                            <td className="border border-slate-200 px-2 py-1 text-right">¥{payment.consumptionTax.toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-white md:bg-transparent p-4 md:p-0 rounded-lg border md:border-none border-slate-200">
                                <h4 className="font-semibold text-slate-700 mb-2">支払金額計算</h4>
                                <table className="w-full text-sm border-collapse tabular-nums">
                                    <tbody>
                                        <tr className="border-b border-slate-200">
                                            <td className="py-2 text-slate-600">小計</td>
                                            <td className="py-2 text-right font-medium">¥{(payment.baseAmount + payment.consumptionTax).toLocaleString()}</td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                            <td className="py-2 text-slate-600">源泉所得税</td>
                                            <td className="py-2 text-right text-red-600 font-medium">▲¥{payment.withholdingTax.toLocaleString()}</td>
                                        </tr>
                                        <tr className="border-t-2 border-slate-800">
                                            <td className="py-2 font-bold text-slate-900">合計</td>
                                            <td className="py-2 text-right font-bold text-lg">¥{payment.finalAmount.toLocaleString()}</td>
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
                        <div className="flex justify-start md:justify-end">
                            <div className="w-full md:w-auto text-left md:text-right text-sm text-slate-600 space-y-1 bg-white md:bg-transparent p-4 md:p-0 rounded-lg border md:border-none border-slate-200">
                                <p className="font-bold text-base text-slate-800 mb-2 md:mb-0">{cInfo.company_name || 'SWIM PARTNERS'}</p>
                                {cInfo.invoice_registration_number && (
                                    <p className="flex justify-between md:block"><span className="md:hidden">登録番号:</span> <span><span className="hidden md:inline">登録番号：</span>{cInfo.invoice_registration_number}</span></p>
                                )}
                                {cInfo.company_address && (
                                    <p className="flex justify-between md:block"><span className="md:hidden">住所:</span> <span><span className="hidden md:inline">住所：</span>{cInfo.company_address}</span></p>
                                )}
                                {cInfo.contact_email && (
                                    <p className="flex justify-between md:block"><span className="md:hidden">連絡先:</span> <span><span className="hidden md:inline">連絡先：</span>{cInfo.contact_email}</span></p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="text-center text-xs text-slate-400 mt-12 print:mt-24">
                        <p>{templateConfig?.payment_slip_footer || 'Swim Partners Manager System'}</p>
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


