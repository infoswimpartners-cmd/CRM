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

interface LessonMaster {
    id: string
    name: string
    active: boolean
    unit_price: number
}

export function AddMembershipTypeDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const [name, setName] = useState('')
    const [fee, setFee] = useState('0')
    const [defaultLessonId, setDefaultLessonId] = useState<string>('none')
    const [rewardMasterId, setRewardMasterId] = useState<string>('none')
    const [lessonMasters, setLessonMasters] = useState<LessonMaster[]>([])

    useEffect(() => {
        const fetchMasters = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('lesson_masters')
                .select('id, name, active, unit_price') // Added unit_price
                .eq('active', true)
                .order('name')
            if (data) setLessonMasters(data as any)
        }
        if (open) fetchMasters()
    }, [open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()

        try {
            const { error } = await supabase
                .from('membership_types')
                .insert({
                    name,
                    fee: parseInt(fee),
                    default_lesson_master_id: defaultLessonId === 'none' ? null : defaultLessonId,
                    reward_master_id: rewardMasterId === 'none' ? null : rewardMasterId,
                })

            if (error) throw error

            toast.success('会員区分を追加しました')
            setOpen(false)
            setName('')
            setFee('0')
            setDefaultLessonId('none')
            setRewardMasterId('none')
            router.refresh()
        } catch (error: any) {
            console.error('Error adding membership type:', error.message, error.details, error.hint)
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
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>会員区分の追加</DialogTitle>
                        <DialogDescription>
                            新しい会員区分と会費、標準レッスンを登録します。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                名称
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                placeholder="正会員"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="fee" className="text-right">
                                会費
                            </Label>
                            <Input
                                id="fee"
                                type="number"
                                value={fee}
                                onChange={(e) => setFee(e.target.value)}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="defaultLesson" className="text-right">
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
                            <Label htmlFor="rewardMaster" className="text-right">
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
        </Dialog >
    )
}
