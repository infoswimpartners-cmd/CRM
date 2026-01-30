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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { submitPayout } from '@/actions/payout'

interface PayoutModalProps {
    coachId: string
    coachName: string
    targetMonth: string
    unpaidAmount: number
}

export function PayoutModal({ coachId, coachName, targetMonth, unpaidAmount }: PayoutModalProps) {
    const [open, setOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [amount, setAmount] = useState(unpaidAmount.toString())
    const [note, setNote] = useState('')
    const [status, setStatus] = useState<'paid' | 'pending'>('paid')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const result = await submitPayout({
                coach_id: coachId,
                amount: parseInt(amount),
                target_month: targetMonth,
                note,
                status // Pass status
            })

            if (result.success) {
                toast.success('支払い情報を登録しました')
                setOpen(false)
                setNote('')
                setStatus('paid') // Reset
            } else {
                toast.error('登録に失敗しました: ' + result.error)
            }
        } catch (error) {
            toast.error('エラーが発生しました')
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="default" className="bg-cyan-600 hover:bg-cyan-700">
                    支払記録
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>支払い記録の登録</DialogTitle>
                    <DialogDescription>
                        {targetMonth}分の {coachName} への支払いを記録します。
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">
                                支払額
                            </Label>
                            <Input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="col-span-3"
                                required
                            />
                        </div>

                        {/* Status Selection */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">ステータス</Label>
                            <div className="col-span-3 flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="status"
                                        value="paid"
                                        checked={status === 'paid'}
                                        onChange={() => setStatus('paid')}
                                        className="accent-cyan-600"
                                    />
                                    <span className="text-sm">支払完了</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="status"
                                        value="pending"
                                        checked={status === 'pending'}
                                        onChange={() => setStatus('pending')}
                                        className="accent-blue-600"
                                    />
                                    <span className="text-sm">処理中 (振込予約等)</span>
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="note" className="text-right">
                                備考
                            </Label>
                            <Input
                                id="note"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="振込完了、手渡し等"
                                className="col-span-3"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            登録する
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
