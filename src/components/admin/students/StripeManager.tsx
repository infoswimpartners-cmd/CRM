'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, ExternalLink, Loader2, Link as LinkIcon, AlertTriangle, Pencil, Copy, Check } from 'lucide-react'
import { createStripeCustomer, createPaymentSetupLink, updateStudentStripeId } from '@/actions/stripe'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    const [isCreating, setIsCreating] = useState(false)
    const [isLinking, setIsLinking] = useState(false)
    const [isManualMode, setIsManualMode] = useState(false)
    const [manualId, setManualId] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)
    const [copied, setCopied] = useState(false)

    async function handleCreateCustomer() {
        setIsCreating(true)
        try {
            const result = await createStripeCustomer(studentId)
            if (result.success) {
                toast.success('Stripe顧客を作成しました')
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
                        <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Stripe顧客データが未作成です</span>
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

                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-full sm:w-auto px-3 text-xs text-slate-600 border-slate-200 hover:bg-white hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all shrink-0"
                                onClick={() => window.open(`https://dashboard.stripe.com/customers/${stripeCustomerId}`, '_blank')}
                            >
                                <ExternalLink className="w-3 h-3 mr-1.5" />
                                管理画面
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
