'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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

interface MembershipType {
    id: string
    name: string
    fee: number
    active: boolean
    default_lesson_master_id: string | null
    reward_master_id: string | null
}

interface EditMembershipTypeDialogProps {
    type: MembershipType
    open: boolean
    onOpenChange: (open: boolean) => void
}

interface LessonMaster {
    id: string
    name: string
    active: boolean
    unit_price: number
}

export function EditMembershipTypeDialog({ type, open, onOpenChange }: EditMembershipTypeDialogProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const [name, setName] = useState(type.name)
    const [fee, setFee] = useState(type.fee.toString())
    const [defaultLessonId, setDefaultLessonId] = useState<string>(type.default_lesson_master_id || 'none')
    const [rewardMasterId, setRewardMasterId] = useState<string>(type.reward_master_id || 'none')
    const [lessonMasters, setLessonMasters] = useState<LessonMaster[]>([])

    useEffect(() => {
        const fetchMasters = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('lesson_masters')
                .select('id, name, active, unit_price')
                .eq('active', true)
                .order('name')
            if (data) setLessonMasters(data as any)
        }
        if (open) fetchMasters()
    }, [open])

    // Update local state when type prop changes
    useEffect(() => {
        setName(type.name)
        setFee(type.fee.toString())
        setDefaultLessonId(type.default_lesson_master_id || 'none')
        setRewardMasterId(type.reward_master_id || 'none')
    }, [type])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()

        try {
            const { error } = await supabase
                .from('membership_types')
                .update({
                    name,
                    fee: parseInt(fee),
                    default_lesson_master_id: defaultLessonId === 'none' ? null : defaultLessonId,
                    reward_master_id: rewardMasterId === 'none' ? null : rewardMasterId,
                })
                .eq('id', type.id)

            if (error) throw error

            toast.success('会員区分を更新しました')
            onOpenChange(false)
            router.refresh()
        } catch (error) {
            console.error('Update Log Error Object:', error)
            // @ts-ignore
            console.error('Update Log Error Message:', error?.message)
            // @ts-ignore
            console.error('Update Log Error Details:', error?.details)
            // @ts-ignore
            toast.error(`更新に失敗しました: ${error?.message} / ${error?.details || ''}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>会員区分の編集</DialogTitle>
                        <DialogDescription>
                            会員区分や会費、標準レッスンを変更します。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right">
                                名称
                            </Label>
                            <Input
                                id="edit-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-fee" className="text-right">
                                会費
                            </Label>
                            <Input
                                id="edit-fee"
                                type="number"
                                value={fee}
                                onChange={(e) => setFee(e.target.value)}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-defaultLesson" className="text-right">
                                標準レッスン
                            </Label>
                            <Select value={defaultLessonId} onValueChange={setDefaultLessonId}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="選択なし" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">選択なし</SelectItem>
                                    {lessonMasters.map((master) => (
                                        <SelectItem key={master.id} value={master.id}>
                                            {master.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-rewardMaster" className="text-right">
                                報酬計算用
                            </Label>
                            <Select value={rewardMasterId} onValueChange={setRewardMasterId}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="選択なし (売上額を使用)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">選択なし (売上額を使用)</SelectItem>
                                    {lessonMasters.map((master) => (
                                        <SelectItem key={master.id} value={master.id}>
                                            {master.name} (単価: ¥{master.unit_price?.toLocaleString()})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
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
