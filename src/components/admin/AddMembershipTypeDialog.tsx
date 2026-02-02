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
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { createMembershipTypeAction } from '@/actions/masters'

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
    // Map of lesson_id -> custom reward price (null means use master price)
    const [selectedLessons, setSelectedLessons] = useState<Map<string, string>>(new Map())
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

    const toggleLesson = (id: string, masterPrice: number) => {
        const newMap = new Map(selectedLessons)
        if (newMap.has(id)) {
            newMap.delete(id)
        } else {
            // Default to empty string (implies master price) or maybe pre-fill?
            // User requested explicit config. Let's default to empty (placeholder will show master price)
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
        try {
            // Prepare data for Server Action
            const selectedLessonsArray = Array.from(selectedLessons.entries()).map(([lessonId, priceStr]) => ({
                id: lessonId,
                rewardPrice: priceStr && !isNaN(parseInt(priceStr)) ? parseInt(priceStr) : null
            }))

            // Call Server Action
            const result = await createMembershipTypeAction({
                name,
                fee: parseInt(fee),
                selectedLessons: selectedLessonsArray
            })

            if (!result.success) {
                throw new Error(result.error)
            }

            toast.success('会員区分を追加しました (Stripe連携)')
            setOpen(false)
            setName('')
            setFee('0')
            setSelectedLessons(new Map())
            router.refresh()
        } catch (error: any) {
            console.error('Error adding membership type:', error)
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
            <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>会員区分の追加</DialogTitle>
                        <DialogDescription>
                            新しい会員区分と会費、標準レッスンを登録します。
                            月会費用の報酬単価を設定する場合は、レッスン選択後に入力してください。
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
                            <p className="col-start-2 col-span-3 text-xs text-muted-foreground">
                                ※0円より大きい場合: レッスン料は会費に含まれるとみなされ、別途請求されません。<br />
                                ※0円の場合: 単発利用とみなされ、レッスン毎に都度請求されます。
                            </p>
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right pt-2">
                                標準レッスン
                            </Label>
                            <div className="col-span-3 border rounded-md p-3 h-[300px] overflow-y-auto space-y-4">
                                {lessonMasters.map((master) => {
                                    const isChecked = selectedLessons.has(master.id)
                                    return (
                                        <div key={master.id} className="flex flex-col space-y-2 border-b pb-2 last:border-0">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`lesson-${master.id}`}
                                                    checked={isChecked}
                                                    onCheckedChange={() => toggleLesson(master.id, master.unit_price)}
                                                />
                                                <label
                                                    htmlFor={`lesson-${master.id}`}
                                                    className="text-sm font-medium leading-none cursor-pointer flex-1"
                                                >
                                                    {master.name} <span className="text-gray-400 text-xs">(通常単価: ¥{master.unit_price.toLocaleString()})</span>
                                                </label>
                                            </div>

                                            {isChecked && (
                                                <div className="flex items-center gap-2 pl-6 animate-in slide-in-from-top-1 duration-200">
                                                    <Label htmlFor={`price-${master.id}`} className="text-xs text-gray-500 whitespace-nowrap">
                                                        報酬計算単価:
                                                    </Label>
                                                    <div className="relative w-32">
                                                        <Input
                                                            id={`price-${master.id}`}
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
        </Dialog >
    )
}
