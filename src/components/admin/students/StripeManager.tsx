'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, ExternalLink, Loader2, Link as LinkIcon, AlertTriangle, Pencil, Copy, Check, Receipt, FileText, Download } from 'lucide-react'
import {
    createStripeCustomer,
    createPaymentSetupLink,
    updateStudentStripeId,
    getStripeCustomerBillingSettings,
    updateStripeCustomerBillingSettings,
    getCustomerReceiptsAndInvoices,
    type CustomerReceiptItem,
} from '@/actions/stripe'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface StripeManagerProps {
    studentId: string
    stripeCustomerId: string | null
    paymentMethodStatus: {
        hasPaymentMethod?: boolean
        deleted?: boolean
        last4?: string
        brand?: string
        paymentMethod?: any
    } | null
}

export function StripeManager({ studentId, stripeCustomerId, paymentMethodStatus }: StripeManagerProps) {
    const router = useRouter()
    const [isCreating, setIsCreating] = useState(false)
    const [isLinking, setIsLinking] = useState(false)
    const [isManualMode, setIsManualMode] = useState(false)
    const [manualId, setManualId] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)
    const [copied, setCopied] = useState(false)

    // 請求書・領収書の宛名とメモ（但書）設定
    const [billingName, setBillingName] = useState('')
    const [receiptMemo, setReceiptMemo] = useState('')
    const [isLoadingSettings, setIsLoadingSettings] = useState(false)
    const [isSavingSettings, setIsSavingSettings] = useState(false)

    // 発行済み領収書・請求書一覧
    const [receipts, setReceipts] = useState<CustomerReceiptItem[]>([])
    const [isLoadingReceipts, setIsLoadingReceipts] = useState(false)

    useEffect(() => {
        if (!stripeCustomerId) return
        let cancelled = false
        setIsLoadingSettings(true)
        setIsLoadingReceipts(true)

        getStripeCustomerBillingSettings(stripeCustomerId)
            .then((res) => {
                if (cancelled) return
                if (res.success) {
                    setBillingName(res.billingName || '')
                    setReceiptMemo(res.receiptMemo || '')
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoadingSettings(false)
            })

        getCustomerReceiptsAndInvoices(stripeCustomerId)
            .then((res) => {
                if (cancelled) return
                if (res.success) {
                    setReceipts(res.items || [])
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoadingReceipts(false)
            })

        return () => { cancelled = true }
    }, [stripeCustomerId])

    async function handleSaveBillingSettings() {
        if (!stripeCustomerId) return
        setIsSavingSettings(true)
        try {
            const res = await updateStripeCustomerBillingSettings(
                studentId,
                stripeCustomerId,
                billingName,
                receiptMemo
            )
            if (res.success) {
                toast.success('請求書・領収書の宛名とメモ欄をStripeに保存しました')
                router.refresh()
            } else {
                toast.error('保存に失敗しました: ' + res.error)
            }
        } finally {
            setIsSavingSettings(false)
        }
    }

    async function handleCreateCustomer() {
        setIsCreating(true)
        try {
            const result = await createStripeCustomer(studentId)
            if (result.success) {
                toast.success('Stripe顧客を作成しました')
                router.refresh()
            } else {
                toast.error('作成失敗: ' + result.error)
            }
        } finally {
            setIsCreating(false)
        }
    }

    async function handleSendSetupLink() {
        setIsLinking(true)
        try {
            const result = await createPaymentSetupLink(studentId)
            if (result.success && result.url) {
                window.open(result.url, '_blank')
                toast.success('決済設定ページを開きました')
            } else {
                toast.error('リンク発行失敗: ' + result.error)
            }
        } finally {
            setIsLinking(false)
        }
    }

    async function handleManualUpdate() {
        if (!manualId.startsWith('cus_')) {
            toast.error('IDは "cus_" から始まる必要があります')
            return
        }
        setIsUpdating(true)
        try {
            const result = await updateStudentStripeId(studentId, manualId)
            if (result.success) {
                toast.success('Stripe IDを手動更新しました')
                setIsManualMode(false)
                setManualId('')
                router.refresh()
            } else {
                toast.error('更新失敗: ' + result.error)
            }
        } finally {
            setIsUpdating(false)
        }
    }

    async function handleCopyId() {
        if (!stripeCustomerId) return
        try {
            await navigator.clipboard.writeText(stripeCustomerId)
            setCopied(true)
            toast.success('Stripe IDをコピーしました')
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            toast.error('コピーに失敗しました')
        }
    }

    return (
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-700">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    決済情報 (Stripe)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {isManualMode ? (
                    /* Manual ID Entry Mode (Unified) */
                    <div className="space-y-3 p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                        <Label className="text-xs font-bold text-slate-600">Stripe Customer ID (手動連携)</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                value={manualId}
                                onChange={(e) => setManualId(e.target.value)}
                                placeholder="cus_..."
                                className="h-9 text-xs font-mono flex-1 bg-white border-slate-200"
                            />
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button
                                    size="sm"
                                    onClick={handleManualUpdate}
                                    disabled={isUpdating}
                                    className="h-9 flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4"
                                >
                                    {isUpdating && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
                                    保存
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setIsManualMode(false)
                                        setManualId('')
                                    }}
                                    className="h-9 flex-1 sm:flex-initial text-xs text-slate-500 border-slate-200 bg-white hover:bg-slate-50 px-3"
                                >
                                    キャンセル
                                </Button>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400">
                            ※ すでにStripe上に存在する顧客ID (cus_...) を入力してください。
                        </p>
                    </div>
                ) : !stripeCustomerId ? (
                    /* Customer not created yet */
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-md border border-yellow-200/70">
                            <div className="flex items-center gap-2 font-medium">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>Stripe顧客データが未作成です</span>
                            </div>
                            <p className="text-[11px] text-yellow-600 leading-relaxed pl-6">
                                ※ 宛名・メモ欄（但書）の設定や領収書の確認は、下の「顧客データを作成する」をクリックするか、コーチアサイン完了後に表示されます。
                            </p>
                        </div>
                        <Button
                            onClick={handleCreateCustomer}
                            disabled={isCreating}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-all"
                        >
                            {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            顧客データを作成する
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setManualId('')
                                setIsManualMode(true)
                            }}
                            className="text-xs text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                        >
                            IDを手動入力する
                        </Button>
                    </div>
                ) : (
                    /* Customer registered */
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                            <span className="text-sm font-medium text-slate-500">ステータス</span>
                            {paymentMethodStatus?.hasPaymentMethod ? (
                                <Badge className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" />
                                    カード登録済 ({paymentMethodStatus.brand} •••• {paymentMethodStatus.last4})
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">
                                    カード未登録
                                </Badge>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Button
                                variant="outline"
                                onClick={handleSendSetupLink}
                                disabled={isLinking}
                                className="w-full justify-start text-slate-600 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/10 transition-all"
                            >
                                {isLinking ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <LinkIcon className="w-4 h-4 mr-2" />
                                )}
                                カード登録リンクを発行/開く
                            </Button>
                            <p className="text-xs text-slate-400 px-1">
                                ※ リンクを開いて生徒にカード情報を入力してもらってください。
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                            <div className="flex flex-col gap-1 items-start overflow-hidden w-full">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Stripe Customer ID</span>
                                <div className="flex items-center gap-2 w-full justify-between sm:justify-start">
                                    <span className="text-xs font-mono text-slate-600 truncate max-w-[200px] sm:max-w-[180px] md:max-w-none">
                                        {stripeCustomerId}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={handleCopyId}
                                            className="text-slate-400 hover:text-indigo-600 transition-all p-1.5 rounded-md hover:bg-white border border-slate-100 shadow-sm"
                                            title="IDをコピー"
                                        >
                                            {copied ? <Check className="w-3 h-3 text-green-600 animate-in fade-in zoom-in-50 duration-200" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setManualId(stripeCustomerId)
                                                setIsManualMode(true)
                                            }}
                                            className="text-slate-400 hover:text-indigo-600 transition-all p-1.5 rounded-md hover:bg-white border border-slate-100 shadow-sm"
                                            title="IDを手動編集"
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="h-8 flex-1 sm:flex-initial px-2.5 text-xs text-slate-600 border-slate-200 hover:bg-white hover:text-indigo-600 hover:border-indigo-200 shadow-xs transition-all shrink-0"
                                >
                                    <Link href={`/admin/approvals?q=${encodeURIComponent(stripeCustomerId)}`}>
                                        <Receipt className="w-3 h-3 mr-1 text-blue-600" />
                                        請求履歴
                                    </Link>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 flex-1 sm:flex-initial px-2.5 text-xs text-slate-600 border-slate-200 hover:bg-white hover:text-indigo-600 hover:border-indigo-200 shadow-xs transition-all shrink-0"
                                    onClick={() => window.open(`https://dashboard.stripe.com/customers/${stripeCustomerId}`, '_blank')}
                                >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    管理画面
                                </Button>
                            </div>
                        </div>

                        {/* 請求書・領収書の宛名とメモ欄（但書）設定 */}
                        <div className="space-y-3 p-3.5 bg-slate-50/80 border border-slate-200/70 rounded-xl">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                    請求書・領収書設定（Stripe宛名・メモ欄）
                                </Label>
                                {isLoadingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                            </div>
                            <div className="space-y-2">
                                <div className="space-y-1">
                                    <Label htmlFor="stripeBillingName" className="text-[11px] font-semibold text-slate-600">
                                        領収書・請求書の宛名（Stripe顧客名）
                                    </Label>
                                    <Input
                                        id="stripeBillingName"
                                        value={billingName}
                                        onChange={(e) => setBillingName(e.target.value)}
                                        placeholder="保護者名や法人名など（未入力時は生徒名）"
                                        className="h-8 text-xs bg-white border-slate-200"
                                        disabled={isLoadingSettings || isSavingSettings}
                                    />
                                    <p className="text-[10px] text-slate-400">
                                        ※ CRM上の生徒名は変更されず、Stripeの請求書・領収書上の宛名のみ変更されます。
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="stripeReceiptMemo" className="text-[11px] font-semibold text-slate-600">
                                        請求書・領収書のメモ欄（但書）
                                    </Label>
                                    <Textarea
                                        id="stripeReceiptMemo"
                                        value={receiptMemo}
                                        onChange={(e) => setReceiptMemo(e.target.value)}
                                        placeholder="例: 但し、水泳個人指導料として"
                                        rows={2}
                                        className="text-xs bg-white border-slate-200 resize-none"
                                        disabled={isLoadingSettings || isSavingSettings}
                                    />
                                    <p className="text-[10px] text-slate-400">
                                        ※ 入力すると、今後の請求書・体験事前決済のStripe領収書メモ欄に自動で反映されます。
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={handleSaveBillingSettings}
                                    disabled={isLoadingSettings || isSavingSettings}
                                    className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                                >
                                    {isSavingSettings && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
                                    Stripe宛名・メモを保存
                                </Button>
                            </div>
                        </div>

                        {/* 領収書・請求書の確認セクション */}
                        <div className="space-y-2.5 p-3.5 bg-white border border-slate-200/80 rounded-xl">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                                    領収書・請求書の確認
                                </Label>
                                {isLoadingReceipts && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                            </div>

                            {!isLoadingReceipts && receipts.length === 0 ? (
                                <p className="text-[11px] text-slate-400 py-2 text-center bg-slate-50/70 rounded-lg">
                                    発行済みの領収書・請求書はまだありません
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                    {receipts.map((item) => {
                                        const dateStr = new Date(item.created * 1000).toLocaleDateString('ja-JP')
                                        const isPaid = item.status === 'paid'
                                        return (
                                            <div
                                                key={item.id}
                                                className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 flex flex-col gap-1.5 text-xs"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono text-[11px] text-slate-500">{dateStr}</span>
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                isPaid
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0'
                                                                    : 'bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0'
                                                            }
                                                        >
                                                            {isPaid ? '支払済' : item.status === 'open' ? '請求中' : item.status}
                                                        </Badge>
                                                    </div>
                                                    <span className="font-bold text-slate-800">
                                                        ¥{item.amount.toLocaleString()}
                                                    </span>
                                                </div>

                                                {(item.customerName || item.description) && (
                                                    <div className="text-[11px] text-slate-600 space-y-0.5 leading-snug">
                                                        {item.customerName && (
                                                            <div className="truncate">
                                                                <span className="text-slate-400">宛名:</span> {item.customerName}
                                                            </div>
                                                        )}
                                                        {item.description && (
                                                            <div className="truncate">
                                                                <span className="text-slate-400">メモ:</span> {item.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {item.invoicePdfUrl && (
                                                        <Button
                                                            asChild
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 px-2 text-[11px] bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                                                        >
                                                            <a href={item.invoicePdfUrl} target="_blank" rel="noopener noreferrer">
                                                                <Download className="w-3 h-3 mr-1" />
                                                                領収書/請求書PDF
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {item.hostedUrl && (
                                                        <Button
                                                            asChild
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 px-2 text-[11px] bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                                                        >
                                                            <a href={item.hostedUrl} target="_blank" rel="noopener noreferrer">
                                                                <ExternalLink className="w-3 h-3 mr-1" />
                                                                Web明細・領収書
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {item.receiptUrl && (
                                                        <Button
                                                            asChild
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 px-2 text-[11px] bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                                                        >
                                                            <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer">
                                                                <Receipt className="w-3 h-3 mr-1" />
                                                                Stripeレシート
                                                            </a>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
