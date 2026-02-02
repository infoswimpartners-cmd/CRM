'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Undo2 } from 'lucide-react'
import { processRefund } from '@/actions/refund'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface RefundDialogProps {
    scheduleId: string
    title: string
    amount: number
    studentName: string
    onRefundComplete?: () => void
}

export function RefundDialog({ scheduleId, title, amount, studentName, onRefundComplete }: RefundDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [refundType, setRefundType] = useState<'full' | 'partial'>('full')
    const [partialAmount, setPartialAmount] = useState<number>(amount)
    const [reason, setReason] = useState('')

    const handleRefund = async () => {
        if (refundType === 'partial' && (partialAmount <= 0 || partialAmount > amount)) {
            toast.error('返金金額が不正です')
            return
        }

        if (!confirm('返金処理を実行しますか？\n（この操作は取り消せません）')) return

        setLoading(true)
        try {
            const result = await processRefund({
                scheduleId,
                amount: refundType === 'partial' ? partialAmount : undefined,
                isFullRefund: refundType === 'full',
                reason
            })

            if (result.success) {
                toast.success('返金処理が完了しました')
                setOpen(false)
                if (onRefundComplete) onRefundComplete()
            } else {
                toast.error('返金に失敗しました: ' + result.error)
            }
        } catch (error) {
            toast.error('エラーが発生しました')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 border-slate-200">
                    <Undo2 className="h-4 w-4 mr-1.5" />
                    返金
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>返金処理</DialogTitle>
                    <DialogDescription>
                        Stripeを通じて返金を実行します。<br />
                        <span className="font-bold text-orange-600">※決済手数料(3.6%)は返還されません。</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-700">
                        <div className="flex justify-between mb-1">
                            <span>対象レッスン</span>
                            <span className="font-bold">{title}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                            <span>生徒名</span>
                            <span>{studentName}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
                            <span>決済金額</span>
                            <span className="font-bold">{formatCurrency(amount)}</span>
                        </div>
                    </div>

                    <RadioGroup
                        defaultValue="full"
                        value={refundType}
                        onValueChange={(v) => setRefundType(v as 'full' | 'partial')}
                        className="flex flex-col gap-2"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="full" id="r-full" />
                            <Label htmlFor="r-full">全額返金 ({formatCurrency(amount)})</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="partial" id="r-partial" />
                            <Label htmlFor="r-partial">一部返金</Label>
                        </div>
                    </RadioGroup>

                    {refundType === 'partial' && (
                        <div className="pl-6">
                            <Label htmlFor="amount" className="text-xs mb-1 block">返金金額</Label>
                            <div className="relative">
                                <Input
                                    id="amount"
                                    type="number"
                                    value={partialAmount}
                                    onChange={(e) => setPartialAmount(Number(e.target.value))}
                                    className="pr-8"
                                    max={amount}
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-slate-500">円</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                手数料等({formatCurrency(amount - partialAmount)})を差し引いた金額を入力してください。
                            </p>
                        </div>
                    )}

                    <div className="space-y-1">
                        <Label htmlFor="reason">返金理由 (管理用メモ)</Label>
                        <Textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="例: 指導員都合によるキャンセル、台風のため中止など"
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                        キャンセル
                    </Button>
                    <Button
                        onClick={handleRefund}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        返金実行
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
