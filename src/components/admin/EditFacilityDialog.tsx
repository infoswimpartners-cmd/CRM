'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import { updateFacilityAction } from '@/actions/facilities'

export interface FacilityItem {
    id: string
    name: string
    is_facility_fee_applied: boolean
    facility_fee?: number | null
    fee_payment_type?: 'reward' | 'expense' | string | null
    created_at: string
}

interface EditFacilityDialogProps {
    facility: FacilityItem | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditFacilityDialog({ facility, open, onOpenChange }: EditFacilityDialogProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [facilityFee, setFacilityFee] = useState<string>('0')
    const [feePaymentType, setFeePaymentType] = useState<'reward' | 'expense'>('reward')

    useEffect(() => {
        if (facility) {
            setName(facility.name)
            const initialFee = typeof facility.facility_fee === 'number'
                ? facility.facility_fee
                : (facility.is_facility_fee_applied ? 1500 : 0)
            setFacilityFee(String(initialFee))
            setFeePaymentType(facility.fee_payment_type === 'expense' ? 'expense' : 'reward')
        }
    }, [facility])

    const parsedFee = Math.max(0, parseInt(facilityFee || '0', 10) || 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!facility) return
        if (!name.trim()) {
            toast.error('施設名を入力してください')
            return
        }

        setLoading(true)
        try {
            const result = await updateFacilityAction(facility.id, {
                name: name.trim(),
                facilityFee: parsedFee,
                isFacilityFeeApplied: parsedFee > 0,
                feePaymentType: parsedFee > 0 ? feePaymentType : 'reward'
            })

            if (!result.success) throw new Error(result.error)

            toast.success('施設情報を更新しました')
            onOpenChange(false)
            router.refresh()
            window.location.reload()
        } catch (error: any) {
            console.error('Error updating facility:', error)
            toast.error(`更新に失敗しました: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    if (!facility) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[460px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>施設の編集</DialogTitle>
                        <DialogDescription>
                            施設名や施設利用料（請求金額・精算方式）を変更します。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right">
                                施設名
                            </Label>
                            <Input
                                id="edit-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                placeholder="〇〇市民プール"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-facility-fee" className="text-right">
                                施設利用料 (円)
                            </Label>
                            <div className="col-span-3 space-y-1">
                                <Input
                                    id="edit-facility-fee"
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={facilityFee}
                                    onChange={(e) => setFacilityFee(e.target.value)}
                                    placeholder="0"
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
                                            ? '源泉税を引かずに全額をそのまま立替経費として返金します。'
                                            : '従来通りレッスン報酬に加算し、源泉計算の対象になります。'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? '更新中...' : '変更を保存'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
