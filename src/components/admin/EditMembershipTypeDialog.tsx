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
import { Checkbox } from "@/components/ui/checkbox"
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
    // Map of lesson_id -> custom reward price (null means use master price)
    const [selectedLessons, setSelectedLessons] = useState<Map<string, string>>(new Map())
    const [lessonMasters, setLessonMasters] = useState<LessonMaster[]>([])

    // Fetch Masters and Existing Relations
    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient()

            // 1. Fetch Masters
            const { data: masters } = await supabase
                .from('lesson_masters')
                .select('id, name, active, unit_price')
                .eq('active', true)
                .order('name')
            if (masters) setLessonMasters(masters as any)

            // 2. Fetch Existing Relations
            if (type.id) {
                const { data: relations } = await supabase
                    .from('membership_type_lessons')
                    .select('lesson_master_id, reward_price')
                    .eq('membership_type_id', type.id)

                if (relations && relations.length > 0) {
                    const newMap = new Map<string, string>()
                    relations.forEach((r: any) => {
                        newMap.set(r.lesson_master_id, r.reward_price !== null ? String(r.reward_price) : '')
                    })
                    setSelectedLessons(newMap)
                } else {
                    // Fallback to legacy field
                    if (type.default_lesson_master_id) {
                        const newMap = new Map<string, string>()
                        newMap.set(type.default_lesson_master_id, '')
                        setSelectedLessons(newMap)
                    } else {
                        setSelectedLessons(new Map())
                    }
                }
            }
        }
        if (open) fetchData()
    }, [open, type.id, type.default_lesson_master_id])

    // Update local state when type prop changes
    useEffect(() => {
        setName(type.name)
        setFee(type.fee.toString())
    }, [type])

    const toggleLesson = (id: string) => {
        const newMap = new Map(selectedLessons)
        if (newMap.has(id)) {
            newMap.delete(id)
        } else {
            newMap.set(id, '')
        }
        setSelectedLessons(newMap)
    }

    const handlePriceChange = (id: string, value: string) => {
        const newMap = new Map(selectedLessons)
        newMap.set(id, value)
        setSelectedLessons(newMap)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()

        try {
            // 1. Update Base Type
            const { error: baseError } = await supabase
                .from('membership_types')
                .update({
                    name,
                    fee: parseInt(fee),
                })
                .eq('id', type.id)

            if (baseError) throw baseError

            // 2. Update Relations (Delete All + Insert All)
            const { error: deleteError } = await supabase
                .from('membership_type_lessons')
                .delete()
                .eq('membership_type_id', type.id)

            if (deleteError) throw deleteError

            if (selectedLessons.size > 0) {
                const relations = Array.from(selectedLessons.entries()).map(([lessonId, priceStr]) => ({
                    membership_type_id: type.id,
                    lesson_master_id: lessonId,
                    reward_price: priceStr && !isNaN(parseInt(priceStr)) ? parseInt(priceStr) : null
                }))

                const { error: insertError } = await supabase
                    .from('membership_type_lessons')
                    .insert(relations)

                if (insertError) throw insertError
            }

            toast.success('会員区分を更新しました')
            onOpenChange(false)
            router.refresh()
        } catch (error) {
            console.error('Update Log Error Object:', JSON.stringify(error, null, 2))
            // @ts-ignore
            toast.error(`更新に失敗しました: ${error?.message || '不明なエラー'}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
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
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right pt-2">
                                標準レッスン<br />(複数選択可)
                            </Label>
                            <div className="col-span-3 border rounded-md p-3 h-[300px] overflow-y-auto space-y-4">
                                {lessonMasters.map((master) => {
                                    const isChecked = selectedLessons.has(master.id)
                                    return (
                                        <div key={master.id} className="flex flex-col space-y-2 border-b pb-2 last:border-0">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`edit-lesson-${master.id}`}
                                                    checked={isChecked}
                                                    onCheckedChange={() => toggleLesson(master.id)}
                                                />
                                                <label
                                                    htmlFor={`edit-lesson-${master.id}`}
                                                    className="text-sm font-medium leading-none cursor-pointer flex-1"
                                                >
                                                    {master.name} <span className="text-gray-400 text-xs">(通常単価: ¥{master.unit_price.toLocaleString()})</span>
                                                </label>
                                            </div>

                                            {isChecked && (
                                                <div className="flex items-center gap-2 pl-6 animate-in slide-in-from-top-1 duration-200">
                                                    <Label htmlFor={`edit-price-${master.id}`} className="text-xs text-gray-500 whitespace-nowrap">
                                                        報酬計算単価:
                                                    </Label>
                                                    <div className="relative w-32">
                                                        <Input
                                                            id={`edit-price-${master.id}`}
                                                            type="number"
                                                            placeholder={master.unit_price.toString()}
                                                            value={selectedLessons.get(master.id) || ''}
                                                            onChange={(e) => handlePriceChange(master.id, e.target.value)}
                                                            className="h-8 text-sm"
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-400">
                                                        (空欄は {master.unit_price}円)
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                                {lessonMasters.length === 0 && (
                                    <div className="text-sm text-gray-500 text-center py-4">
                                        有効なレッスンマスタがありません
                                    </div>
                                )}
                            </div>
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
