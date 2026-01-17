'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Printer } from "lucide-react"

interface PaymentData {
    id: string
    month: string
    baseAmount: number // 税抜報酬額
    isInvoiceRegistered: boolean // インボイス登録有無
    paymentDate: string
}

interface PaymentDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    payment: PaymentData | null
    coachName: string
}

export function PaymentDetailDialog({ open, onOpenChange, payment, coachName }: PaymentDetailDialogProps) {
    if (!payment) return null

    // --- 計算ロジック ---
    const RATE_TAX = 0.10 // 消費税 10%
    const RATE_WITHHOLDING = 0.1021 // 源泉徴収税率 10.21%
    const SYSTEM_FEE_RATE = 0.05 // システム利用料 (仮: 5%)
    const TRANSFER_FEE = 220 // 振込手数料 (仮)

    // 1. 消費税 (インボイス登録ありなら10%, なしなら0とするか、内税とするか。ここでは指示通り登録あり=10%明記とする)
    // ※ 実務上は免税でも経過措置などあるが、シンプルに「登録あり=外税10%付与」のモデルで実装する
    const consumptionTax = payment.isInvoiceRegistered ? Math.floor(payment.baseAmount * RATE_TAX) : 0

    // 2. 源泉所得税 (支払い金額 - 100万 ... の計算。ここでは簡易的にすべて100万以下と仮定して 10.21%)
    // ※ 基礎控除などが絡む場合もあるが、指示書の「100万円以下: 10.21%」に従う
    // ※ 消費税と区分されている場合は「税抜」に掛けるとあるので baseAmount に掛ける
    const withholdingTax = Math.floor(payment.baseAmount * RATE_WITHHOLDING)

    // 3. システム利用料
    const systemFee = Math.floor(payment.baseAmount * SYSTEM_FEE_RATE)

    // 4. 差引支払額
    // ベース + 消費税 - 源泉税 - システム料 - 振込手数料
    const finalAmount = payment.baseAmount + consumptionTax - withholdingTax - systemFee - TRANSFER_FEE

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-white text-slate-900">
                <DialogHeader className="border-b border-slate-100 pb-4 mb-4">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        支払通知書
                        <span className="text-sm font-normal text-slate-500 ml-2">({payment.month})</span>
                    </DialogTitle>
                    <DialogDescription>
                        以下の内容で振込手続が完了いたしました。
                    </DialogDescription>
                </DialogHeader>

                {/* 書類本体エリア - 印刷用スタイルを意識 */}
                <div className="p-6 border border-slate-200 rounded-lg bg-slate-50/50 space-y-8 font-serif">

                    {/* Header Info */}
                    <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6">
                        <div>
                            <h2 className="text-2xl font-bold border-b border-slate-400 inline-block pb-1 mb-2">
                                {coachName} 様
                            </h2>
                            <p className="text-slate-600 mt-2">下記の通り、報酬をお支払いいたします。</p>
                        </div>
                        <div className="text-right text-sm text-slate-600 space-y-1">
                            <p><span className="font-semibold">発行日:</span> {payment.paymentDate}</p>
                            <p><span className="font-semibold">No:</span> {payment.id}</p>
                        </div>
                    </div>

                    {/* Main Amount */}
                    <div className="bg-white p-4 border border-slate-200 rounded-lg text-center">
                        <p className="text-sm text-slate-500 mb-1">支払金額合計 (手取り額)</p>
                        <p className="text-4xl font-bold text-slate-900">
                            ¥{finalAmount.toLocaleString()}
                        </p>
                    </div>

                    {/* Payment Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <p className="font-semibold text-slate-700">【振込情報】</p>
                            <p>支払予定日: {payment.paymentDate}</p>
                            <p>振込先銀行: 三井住友銀行 渋谷支店 (****)</p>
                        </div>
                    </div>

                    {/* Details Table */}
                    <div>
                        <p className="font-semibold text-slate-700 mb-2">【内訳詳細】</p>
                        <table className="w-full text-sm border-collapse tabular-nums">
                            <tbody>
                                <tr className="border-b border-slate-200">
                                    <td className="py-2 text-slate-600">報酬金額 (税抜)</td>
                                    <td className="py-2 text-right font-medium">¥{payment.baseAmount.toLocaleString()}</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="py-2 text-slate-600">消費税 (10%) {!payment.isInvoiceRegistered && <span className="text-xs text-slate-400">(免税)</span>}</td>
                                    <td className="py-2 text-right font-medium">¥{consumptionTax.toLocaleString()}</td>
                                </tr>
                                <tr className="border-b border-slate-200 bg-red-50/30">
                                    <td className="py-2 text-slate-600 pl-2">源泉所得税</td>
                                    <td className="py-2 text-right text-red-600 font-medium">▲¥{withholdingTax.toLocaleString()}</td>
                                </tr>
                                <tr className="border-b border-slate-200 bg-red-50/30">
                                    <td className="py-2 text-slate-600 pl-2">システム利用料 (5%)</td>
                                    <td className="py-2 text-right text-red-600 font-medium">▲¥{systemFee.toLocaleString()}</td>
                                </tr>
                                <tr className="border-b border-slate-200 bg-red-50/30">
                                    <td className="py-2 text-slate-600 pl-2">振込手数料</td>
                                    <td className="py-2 text-right text-red-600 font-medium">▲¥{TRANSFER_FEE.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Check Logic Formula Display for transparency */}
                        <div className="mt-4 text-xs text-slate-400 text-right">
                            合計 = 税抜 + 消費税 - 源泉税 - 手数料
                        </div>
                    </div>

                    {/* Footer / Issuer */}
                    <div className="border-t-2 border-slate-200 pt-6 mt-8">
                        <div className="flex justify-end">
                            <div className="text-right text-sm text-slate-600 space-y-1">
                                <p className="font-bold text-base text-slate-800">スイムパートナーズ運営事務局</p>
                                <p>株式会社スイムテック</p>
                                <p>登録番号：T1234567890123</p>
                                <p>住所：東京都渋谷区神宮前1-1-1</p>
                                <p>連絡先：support@swimpartners.jp</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-4">
                    <Button variant="outline" className="gap-2">
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
