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
    unit_price: number | null
    pair_unit_price: number | null
}

export function EditMembershipTypeDialog({ type, open, onOpenChange }: EditMembershipTypeDialogProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const [name, setName] = useState(type.name)
    const [fee, setFee] = useState(type.fee.toString())
    const [pairFee, setPairFee] = useState((type as any).pair_fee?.toString() || '')
    const [stripeProductId, setStripeProductId] = useState((type as any).stripe_product_id || '')
    const [stripePriceId, setStripePriceId] = useState((type as any).stripe_price_id || '')
    const [stripePairProductId, setStripePairProductId] = useState((type as any).stripe_pair_product_id || '')
    const [stripePairPriceId, setStripePairPriceId] = useState((type as any).stripe_pair_price_id || '')
    // Map of lesson_id -> { reward: string, unit: string, pair: string }
    const [selectedLessons, setSelectedLessons] = useState<Map<string, { reward: string, unit: string, pair: string }>>(new Map())
    const [lessonMasters, setLessonMasters] = useState<LessonMaster[]>([])

    // Fetch Masters and Existing Relations
    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient()

            // 1. Fetch Masters
            const { data: masters } = await supabase
                .from('lesson_masters')
                .select('id, name, active, unit_price, pair_unit_price')
                .eq('active', true)
                .order('name')
            if (masters) setLessonMasters(masters as any)

            // 2. Fetch Existing Relations
            if (type.id) {
                const { data: relations } = await supabase
                    .from('membership_type_lessons')
                    .select('lesson_master_id, reward_price, unit_price, pair_unit_price')
                    .eq('membership_type_id', type.id)

                if (relations && relations.length > 0) {
                    const newMap = new Map<string, { reward: string, unit: string, pair: string }>()
                    relations.forEach((r: any) => {
                        newMap.set(r.lesson_master_id, {
                            reward: r.reward_price !== null ? String(r.reward_price) : '',
                            unit: r.unit_price !== null ? String(r.unit_price) : '',
                            pair: r.pair_unit_price !== null ? String(r.pair_unit_price) : ''
                        })
                    })
                    setSelectedLessons(newMap)
                } else {
                    // Fallback to legacy field
                    if (type.default_lesson_master_id) {
                        const newMap = new Map<string, { reward: string, unit: string, pair: string }>()
                        newMap.set(type.default_lesson_master_id, { reward: '', unit: '', pair: '' })
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
        setPairFee((type as any).pair_fee?.toString() || '')
        setStripeProductId((type as any).stripe_product_id || '')
        setStripePriceId((type as any).stripe_price_id || '')
        setStripePairProductId((type as any).stripe_pair_product_id || '')
        setStripePairPriceId((type as any).stripe_pair_price_id || '')
    }, [type])

    const toggleLesson = (id: string) => {
        const newMap = new Map(selectedLessons)
        if (newMap.has(id)) {
            newMap.delete(id)
        } else {
            newMap.set(id, { reward: '', unit: '', pair: '' })
        }
        setSelectedLessons(newMap)
    }

    const handlePriceChange = (id: string, field: 'reward' | 'unit' | 'pair', value: string) => {
        const newMap = new Map(selectedLessons)
        const current = newMap.get(id) || { reward: '', unit: '', pair: '' }
        newMap.set(id, { ...current, [field]: value })
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
                    pair_fee: pairFee ? parseInt(pairFee) : null,
                    stripe_product_id: stripeProductId || null,
                    stripe_price_id: stripePriceId || null,
                    stripe_pair_product_id: stripePairProductId || null,
                    stripe_pair_price_id: stripePairPriceId || null,
                    default_lesson_master_id: selectedLessons.size > 0 ? Array.from(selectedLessons.keys())[0] : null,
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
                const relations = Array.from(selectedLessons.entries()).map(([lessonId, prices]) => ({
                    membership_type_id: type.id,
                    lesson_master_id: lessonId,
                    reward_price: prices.reward && !isNaN(parseInt(prices.reward)) ? parseInt(prices.reward) : null,
                    unit_price: prices.unit && !isNaN(parseInt(prices.unit)) ? parseInt(prices.unit) : null,
                    pair_unit_price: prices.pair && !isNaN(parseInt(prices.pair)) ? parseInt(prices.pair) : null
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
                            <p className="col-start-2 col-span-3 text-xs text-muted-foreground">
                                ※0円より大きい場合: レッスン料は会費に含まれるとみなされ、別途請求されません。<br />
                                ※0円の場合: 単発利用とみなされ、レッスン毎に都度請求されます。
                            </p>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-pair-fee" className="text-right text-xs font-bold text-green-700 whitespace-nowrap">
                                ペア会費 (任意)
                            </Label>
                            <Input
                                id="edit-pair-fee"
                                type="number"
                                value={pairFee}
                                onChange={(e) => setPairFee(e.target.value)}
                                className="col-span-3 border-green-200 focus:border-green-500"
                                placeholder="例: 26100"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="stripe-product-id" className="text-right whitespace-nowrap text-xs">
                                Stripe商品ID
                            </Label>
                            <Input
                                id="stripe-product-id"
                                value={stripeProductId}
                                onChange={(e) => setStripeProductId(e.target.value)}
                                className="col-span-3"
                                placeholder="prod_..."
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="stripe-price-id" className="text-right whitespace-nowrap text-xs">
                                Stripe価格ID
                            </Label>
                            <Input
                                id="stripe-price-id"
                                value={stripePriceId}
                                onChange={(e) => setStripePriceId(e.target.value)}
                                className="col-span-3"
                                placeholder="price_..."
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="stripe-pair-product-id" className="text-right whitespace-nowrap text-xs">
                                Stripeペア商品ID
                            </Label>
                            <Input
                                id="stripe-pair-product-id"
                                value={stripePairProductId}
                                onChange={(e) => setStripePairProductId(e.target.value)}
                                className="col-span-3"
                                placeholder="prod_..."
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="stripe-pair-price-id" className="text-right whitespace-nowrap text-xs">
                                Stripeペア価格ID
                            </Label>
                            <Input
                                id="stripe-pair-price-id"
                                value={stripePairPriceId}
                                onChange={(e) => setStripePairPriceId(e.target.value)}
                                className="col-span-3"
                                placeholder="price_..."
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
                                                    {master.name} <span className="text-gray-400 text-xs">(通常単価: ¥{master.unit_price?.toLocaleString() ?? '—'})</span>
                                                </label>
                                            </div>

                                            {isChecked && (
                                                <div className="space-y-3 pl-6 pt-2 animate-in slide-in-from-top-1 duration-200">
                                                    {/* 報酬計算単価 */}
                                                    <div className="flex items-center gap-2">
                                                        <Label htmlFor={`edit-reward-${master.id}`} className="text-xs text-orange-600 font-bold whitespace-nowrap w-20">
                                                            コーチ報酬:
                                                        </Label>
                                                        <div className="relative w-32">
                                                            <Input
                                                                id={`edit-reward-${master.id}`}
                                                                type="number"
                                                                placeholder={master.unit_price?.toString() ?? '0'}
                                                                value={selectedLessons.get(master.id)?.reward || ''}
                                                                onChange={(e) => handlePriceChange(master.id, 'reward', e.target.value)}
                                                                className="h-8 text-sm border-orange-200 focus:border-orange-500"
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-400">
                                                            (空欄: {master.unit_price ?? 0}円)
                                                        </span>
                                                    </div>

                                                    {/* 通常受講料 (単発用) */}
                                                    <div className="flex items-center gap-2">
                                                        <Label htmlFor={`edit-unit-${master.id}`} className="text-xs text-blue-600 font-bold whitespace-nowrap w-20">
                                                            通常受講料:
                                                        </Label>
                                                        <div className="relative w-32">
                                                            <Input
                                                                id={`edit-unit-${master.id}`}
                                                                type="number"
                                                                placeholder={master.unit_price?.toString() ?? '0'}
                                                                value={selectedLessons.get(master.id)?.unit || ''}
                                                                onChange={(e) => handlePriceChange(master.id, 'unit', e.target.value)}
                                                                className="h-8 text-sm border-blue-200 focus:border-blue-500"
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-400">
                                                            (空欄: {master.unit_price ?? 0}円)
                                                        </span>
                                                    </div>

                                                    {/* ペア受講料 (単発用) */}
                                                    <div className="flex items-center gap-2">
                                                        <Label htmlFor={`edit-pair-${master.id}`} className="text-xs text-green-600 font-bold whitespace-nowrap w-20">
                                                            ペア受講料:
                                                        </Label>
                                                        <div className="relative w-32">
                                                            <Input
                                                                id={`edit-pair-${master.id}`}
                                                                type="number"
                                                                placeholder={master.pair_unit_price?.toString() ?? '0'}
                                                                value={selectedLessons.get(master.id)?.pair || ''}
                                                                onChange={(e) => handlePriceChange(master.id, 'pair', e.target.value)}
                                                                className="h-8 text-sm border-green-200 focus:border-green-500"
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-400">
                                                            (空欄: {master.pair_unit_price ?? 0}円)
                                                        </span>
                                                    </div>
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
