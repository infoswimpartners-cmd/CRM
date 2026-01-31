'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, ExternalLink, Loader2, Link as LinkIcon, AlertTriangle, Pencil } from 'lucide-react'
import { createStripeCustomer, createPaymentSetupLink, updateStudentStripeId } from '@/actions/stripe'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface StripeManagerProps {
    studentId: string
    stripeCustomerId: string | null
    paymentMethodStatus: {
        hasPaymentMethod: boolean
        last4?: string
        brand?: string
    } | null
}

export function StripeManager({ studentId, stripeCustomerId, paymentMethodStatus }: StripeManagerProps) {
    const [isCreating, setIsCreating] = useState(false)
    const [isLinking, setIsLinking] = useState(false)
    const [isManualMode, setIsManualMode] = useState(false)
    const [manualId, setManualId] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)

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
                // In a real app we might email this, but here we open it or copy it.
                // Let's open in new tab for Admin to perhaps share or guide?
                // Or better, copy to clipboard.
                // For simplicity: Open in new tab, but also copy.
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
                toast.error('更正失敗: ' + result.error)
            }
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <Card className="bg-white border-slate-200">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-700">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    決済情報 (Stripe)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {!stripeCustomerId && !isManualMode ? (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Stripe顧客データが未作成です</span>
                        </div>
                        <Button
                            onClick={handleCreateCustomer}
                            disabled={isCreating}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            顧客データを作成する
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsManualMode(true)}
                            className="text-xs text-slate-500 hover:text-indigo-600"
                        >
                            IDを手動入力する
                        </Button>
                    </div>
                ) : !stripeCustomerId && isManualMode ? (
                    // Manual Mode when no ID exists
                    null
                ) : (
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
                                className="w-full justify-start text-slate-600"
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

                        <div className="text-xs text-slate-400 font-mono text-center flex justify-center items-center gap-2 group">
                            ID: {stripeCustomerId}
                            <button
                                onClick={() => setIsManualMode(true)}
                                className="text-slate-400 hover:text-indigo-600 transition-all p-1"
                                title="IDを手動編集"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        </div>
                    </div >
                )
                }

                {/* Manual ID Entry Mode */}
                {
                    isManualMode && (
                        <div className="pt-4 border-t border-slate-100">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-600">Stripe Customer ID (手動連携)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={manualId}
                                        onChange={(e) => setManualId(e.target.value)}
                                        placeholder="cus_..."
                                        className="h-8 text-xs font-mono"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={handleManualUpdate}
                                        disabled={isUpdating}
                                        className="h-8 bg-slate-800 hover:bg-slate-700 text-white"
                                    >
                                        {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : '保存'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            setIsManualMode(false);
                                            setManualId('');
                                        }}
                                        className="h-8 w-8 p-0"
                                    >
                                        X
                                    </Button>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    ※ すでにStripe上に存在する顧客ID (cus_...) を入力してください。
                                </p>
                            </div>
                        </div>
                    )
                }
            </CardContent >
        </Card >
    )
}
