'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { createFacilityAction } from '@/actions/facilities'

export function AddFacilityDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const [name, setName] = useState('')
    const [facilityFee, setFacilityFee] = useState<string>('0')
    const [feePaymentType, setFeePaymentType] = useState<'reward' | 'expense'>('reward')

    const parsedFee = Math.max(0, parseInt(facilityFee || '0', 10) || 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const result = await createFacilityAction({
                name,
                facilityFee: parsedFee,
                isFacilityFeeApplied: parsedFee > 0,
                feePaymentType: parsedFee > 0 ? feePaymentType : 'reward'
            })

            if (!result.success) throw new Error(result.error)

            toast.success('施設を追加しました')
            setOpen(false)
            setName('')
            setFacilityFee('0')
            setFeePaymentType('reward')
            window.location.reload()
        } catch (error: any) {
            console.error('Error adding facility:', error)
            toast.error(`追加に失敗しました: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> 新規追加
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>施設の追加</DialogTitle>
                        <DialogDescription>
                            利用する施設と、施設利用料（請求金額・精算方式）を登録します。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                施設名
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                placeholder="〇〇市民プール"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="facility-fee" className="text-right">
                                施設利用料 (円)
                            </Label>
                            <div className="col-span-3 space-y-1">
                                <Input
                                    id="facility-fee"
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={facilityFee}
                                    onChange={(e) => setFacilityFee(e.target.value)}
                                    placeholder="0（不要な場合は0）"
                                />
                                <p className="text-[11px] text-slate-500">
                                    ※ 顧客への請求に上乗せする施設利用料（例: 1500, 4000）
                                </p>
                            </div>
                        </div>
                        {parsedFee > 0 && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">
                                    コーチ精算方式
                                </Label>
                                <div className="col-span-3 space-y-1">
                                    <Select
                                        value={feePaymentType}
                                        onValueChange={(val: 'reward' | 'expense') => setFeePaymentType(val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="expense">立替経費精算（源泉徴収なし・満額返金）</SelectItem>
                                            <SelectItem value="reward">報酬に加算（従来通り・源泉対象）</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[11px] text-slate-500">
                                        {feePaymentType === 'expense'
                                            ? '源泉税を引かずに4,000円等の全額をそのまま振込加算します。'
                                            : '従来通りレッスン報酬に加算し、源泉計算の対象になります。'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? '保存中...' : '保存'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
