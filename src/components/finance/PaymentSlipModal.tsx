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
    totalReward: number
}

export function PaymentSlipModal({ coachName, targetMonth, rate, details, totalReward }: PaymentSlipModalProps) {
    const [open, setOpen] = useState(false)

    const handlePrint = () => {
        window.print()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="支払明細書">
                    <FileText className="h-4 w-4 text-slate-500 hover:text-cyan-600" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:shadow-none print:border-none">
                <div className="print:hidden">
                    <DialogHeader>
                        <DialogTitle>支払明細書プレビュー</DialogTitle>
                        <DialogDescription>
                            {targetMonth}分の支払明細詳細です。
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Printable Area */}
                <div className="p-8 bg-white" id="payment-slip">
                    <div className="text-center mb-8 border-b pb-4">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">支払明細書</h2>
                        <p className="text-slate-500">{targetMonth}分</p>
                    </div>

                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{coachName} 様</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-500 mb-1">適用レート</p>
                            <p className="text-lg font-bold">{(rate * 100).toFixed(0)}%</p>
                        </div>
                    </div>

                    <div className="mb-8">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="py-2 font-medium text-slate-500">日付</th>
                                    <th className="py-2 font-medium text-slate-500">区分</th>
                                    <th className="py-2 font-medium text-slate-500 text-right">売上(税込)</th>
                                    <th className="py-2 font-medium text-slate-500 text-right">報酬額</th>
                                </tr>
                            </thead>
                            <tbody>
                                {details.map((detail, index) => (
                                    <tr key={index} className="border-b border-slate-100">
                                        <td className="py-3 text-slate-700">
                                            {format(new Date(detail.date), 'MM/dd')}
                                        </td>
                                        <td className="py-3 text-slate-700">{detail.title}</td>
                                        <td className="py-3 text-right text-slate-700">
                                            ¥{detail.price.toLocaleString()}
                                        </td>
                                        <td className="py-3 text-right font-medium">
                                            ¥{detail.reward.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-slate-300">
                                    <td colSpan={2} className="py-4 font-bold text-slate-800">合計</td>
                                    <td className="py-4 text-right font-bold text-slate-800">
                                        ¥{details.reduce((sum, d) => sum + d.price, 0).toLocaleString()}
                                    </td>
                                    <td className="py-4 text-right font-bold text-xl text-slate-900">
                                        ¥{totalReward.toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="text-center text-xs text-slate-400 mt-12 print:mt-24">
                        <p>Swim Partners Manager System</p>
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
