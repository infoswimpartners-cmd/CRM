'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { FileText, Printer } from 'lucide-react'
import { format } from 'date-fns'

interface PaymentSlipModalProps {
    coachName: string
    targetMonth: string
    rate: number
    details: any[]
    baseAmount: number
    consumptionTax: number
    withholdingTax: number
    systemFee: number
    transferFee: number
    finalAmount: number
    companyInfo: any // Record<string, string>
    templateConfig?: {
        title?: string
        headerPaid?: string
        headerProcessing?: string
        footer?: string
    }
}

export function PaymentSlipModal({
    coachName,
    targetMonth,
    rate,
    details,
    baseAmount,
    consumptionTax,
    withholdingTax,
    systemFee,
    transferFee,
    finalAmount,
    companyInfo,
    templateConfig
}: PaymentSlipModalProps) {
    const [open, setOpen] = useState(false)

    const handlePrint = () => {
        window.print()
    }

    // Fallback if APIs fail
    // Use provided info or empty object
    const cInfo = companyInfo || {}

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="支払通知書">
                    <FileText className="h-4 w-4 text-slate-500 hover:text-cyan-600" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:shadow-none print:border-none">
                <div className="print:hidden">
                    <DialogHeader>
                        <DialogTitle>支払通知書プレビュー</DialogTitle>
                        <DialogDescription>
                            {targetMonth}分の支払通知詳細です。
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Printable Area */}
                <div className="p-8 bg-white" id="payment-slip">
                    <div className="text-center mb-8 border-b pb-4">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">{templateConfig?.title || '支払通知書'}</h2>
                        <p className="text-slate-500">{targetMonth}分</p>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{coachName} 様</h3>
                        </div>
                        <div className="text-left md:text-right">
                            <p className="text-sm text-slate-500 mb-1">適用レート</p>
                            <p className="text-lg font-bold">{(rate * 100).toFixed(0)}%</p>
                        </div>
                    </div>

                    <div className="mb-8 overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="py-2 font-medium text-slate-500 whitespace-nowrap">日付</th>
                                    <th className="py-2 font-medium text-slate-500">レッスン</th>
                                    <th className="py-2 font-medium text-slate-500">生徒氏名</th>
                                    <th className="py-2 font-medium text-slate-500 text-right whitespace-nowrap">売上<br className="md:hidden" />(税込)</th>
                                    <th className="py-2 font-medium text-slate-500 text-right whitespace-nowrap">報酬額</th>
                                </tr>
                            </thead>
                            <tbody>
                                {details.map((detail, index) => (
                                    <tr key={index} className="border-b border-slate-100">
                                        <td className="py-3 text-slate-700 whitespace-nowrap">
                                            {format(new Date(detail.date), 'MM/dd')}
                                        </td>
                                        <td className="py-3 text-slate-700">{detail.title}</td>
                                        <td className="py-3 text-slate-700">{detail.studentName}</td>
                                        <td className="py-3 text-right text-slate-700 whitespace-nowrap">
                                            ¥{detail.price.toLocaleString()}
                                        </td>
                                        <td className="py-3 text-right font-medium whitespace-nowrap">
                                            ¥{detail.reward.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-slate-300 bg-slate-50">
                                    <td colSpan={4} className="py-2 pl-2 font-bold text-slate-600">報酬金額 <span className="text-xs font-normal text-slate-500">(税込)</span></td>
                                    <td className="py-2 text-right font-bold text-slate-800 whitespace-nowrap">¥{baseAmount.toLocaleString()}</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td colSpan={4} className="py-2 pl-2 text-slate-600">源泉所得税</td>
                                    <td className="py-2 text-right font-medium text-red-600 whitespace-nowrap">▲¥{withholdingTax.toLocaleString()}</td>
                                </tr>
                                <tr className="border-t-2 border-slate-800">
                                    <td colSpan={4} className="py-4 pl-2 font-bold text-xl text-slate-900">手取支給額</td>
                                    <td className="py-4 text-right font-bold text-xl text-slate-900 whitespace-nowrap">
                                        ¥{finalAmount.toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
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

                    <div className="text-center text-xs text-slate-400 mt-12 print:mt-24">
                        <p>{templateConfig?.footer || 'Swim Partners Manager System'}</p>
                    </div>
                </div>

                <div className="print:hidden">
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>閉じる</Button>
                        <Button onClick={handlePrint} className="gap-2">
                            <Printer className="w-4 h-4" />
                            印刷する
                        </Button>
                    </DialogFooter>
                </div>

                {/* Print Styles */}
                <style jsx global>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #payment-slip, #payment-slip * {
                            visibility: visible;
                        }
                        #payment-slip {
                            position: fixed;
                            left: 0;
                            top: 0;
                            width: 100%;
                            margin: 0;
                            padding: 20px;
                        }
                        .print\\:hidden {
                            display: none !important;
                        }
                    }
                `}</style>
            </DialogContent>
        </Dialog>
    )
}
