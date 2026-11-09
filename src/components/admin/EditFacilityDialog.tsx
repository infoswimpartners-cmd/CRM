'use client'

import { useState } from 'react'
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
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { updateFacilityAction } from '@/actions/facilities'

interface Facility {
    id: string
    name: string
    is_facility_fee_applied: boolean
    created_at: string
}

interface EditFacilityDialogProps {
    facility: Facility | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditFacilityDialog({ facility, open, onOpenChange }: EditFacilityDialogProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState(facility?.name || '')
    const [isFacilityFeeApplied, setIsFacilityFeeApplied] = useState(facility?.is_facility_fee_applied || false)

    // ダイアログが開いた時・対象施設が変わった時に値をセット
    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen && facility) {
            setName(facility.name)
            setIsFacilityFeeApplied(facility.is_facility_fee_applied)
        }
        onOpenChange(isOpen)
    }

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
                isFacilityFeeApplied
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
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>施設の編集</DialogTitle>
                        <DialogDescription>
                            施設名や施設利用料の適用設定を変更します。
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
                            <Label htmlFor="edit-is-fee-applied" className="text-right">
                                施設利用料
                            </Label>
                            <div className="flex items-center space-x-2 col-span-3">
                                <Checkbox
                                    id="edit-is-fee-applied"
                                    checked={isFacilityFeeApplied}
                                    onCheckedChange={(checked) => setIsFacilityFeeApplied(checked as boolean)}
                                />
                                <label
                                    htmlFor="edit-is-fee-applied"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    施設利用料（+1,500円）を適用する
                                </label>
                            </div>
                        </div>
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
