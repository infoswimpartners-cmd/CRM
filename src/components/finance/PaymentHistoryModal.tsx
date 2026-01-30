'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { togglePayoutStatus, deletePayout } from '@/actions/payout'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PayoutRecord {
    id: string
    amount: number
    status: 'paid' | 'pending'
    paid_at: string
    note: string
}

interface PaymentHistoryModalProps {
    coachName: string
    targetMonth: string
    payouts: PayoutRecord[]
    triggerContent: React.ReactNode
}

export function PaymentHistoryModal({ coachName, targetMonth, payouts, triggerContent }: PaymentHistoryModalProps) {
    const [open, setOpen] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)

    async function handleToggle(id: string, currentStatus: 'paid' | 'pending') {
        if (isProcessing) return
        setIsProcessing(true)
        try {
            const result = await togglePayoutStatus(id, currentStatus)
            if (result.success) {
                toast.success('ステータスを更新しました')
            } else {
                toast.error('更正に失敗しました')
            }
        } catch (e) {
            toast.error('エラーが発生しました')
        } finally {
            setIsProcessing(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('本当にこの履歴を削除しますか？')) return
        if (isProcessing) return
        setIsProcessing(true)
        try {
            const result = await deletePayout(id)
            if (result.success) {
                toast.success('履歴を削除しました')
                if (payouts.length === 1) setOpen(false) // Close if last item
            } else {
                toast.error('削除に失敗しました')
            }
        } catch (e) {
            toast.error('エラーが発生しました')
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild className="cursor-pointer hover:opacity-70 transition-opacity">
                {triggerContent}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{coachName} 様 - {targetMonth}支払履歴</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {payouts.length === 0 ? (
                        <p className="text-center text-slate-500 py-4">支払履歴はありません</p>
                    ) : (
                        <div className="space-y-3">
                            {payouts.map(payout => (
                                <div key={payout.id} className="flex flex-col gap-2 p-3 border rounded-lg bg-slate-50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-lg">¥{payout.amount.toLocaleString()}</div>
                                            <div className="text-xs text-slate-400">
                                                {format(new Date(payout.paid_at), 'yyyy/MM/dd HH:mm')}
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={cn(
                                            payout.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                                        )}>
                                            {payout.status === 'paid' ? '完了' : '処理中'}
                                        </Badge>
                                    </div>

                                    {payout.note && (
                                        <div className="text-sm text-slate-600 bg-white p-2 rounded border border-slate-100">
                                            {payout.note}
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-2 mt-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggle(payout.id, payout.status)}
                                            disabled={isProcessing}
                                            className="h-8 text-slate-500 hover:text-blue-600"
                                            title="ステータス変更"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5 mr-1" />
                                            {payout.status === 'paid' ? '処理中に戻す' : '完了にする'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(payout.id)}
                                            disabled={isProcessing}
                                            className="h-8 text-slate-500 hover:text-red-600"
                                            title="削除"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
