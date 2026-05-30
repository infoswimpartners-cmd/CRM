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
import { Textarea } from "@/components/ui/textarea"
import { toast } from 'sonner'
import { Package } from 'lucide-react'
import { updatePackageTypeAction } from '@/actions/masters'

interface PackageType {
    id: string
    name: string
    fee: number
    ticket_count: number
    stripe_product_id?: string | null
    stripe_price_id?: string | null
    active: boolean
    default_lesson_master_id: string | null
    description?: string | null
    rules?: string | null
}

interface EditPackageTypeDialogProps {
    type: PackageType
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

export function EditPackageTypeDialog({ type, open, onOpenChange }: EditPackageTypeDialogProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const [name, setName] = useState(type.name)
    const [fee, setFee] = useState(String(type.fee))
    const [ticketCount, setTicketCount] = useState(String(type.ticket_count || 0))
    const [stripeProductId, setStripeProductId] = useState(type.stripe_product_id || '')
    const [stripePriceId, setStripePriceId] = useState(type.stripe_price_id || '')
    const [description, setDescription] = useState(type.description || '')
    const [rules, setRules] = useState(type.rules || '')

    // 標準レッスン・報酬単価設定用のState
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
        setFee(String(type.fee))
        setTicketCount(String(type.ticket_count || 0))
        setStripeProductId(type.stripe_product_id || '')
        setStripePriceId(type.stripe_price_id || '')
        setDescription(type.description || '')
        setRules(type.rules || '')
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
        if (!name || !fee || !stripeProductId) {
            toast.error('必須項目を入力してください')
            return
        }
        setLoading(true)
        try {
            const formattedLessons = Array.from(selectedLessons.entries()).map(([lessonId, prices]) => ({
                id: lessonId,
                rewardPrice: prices.reward && !isNaN(parseInt(prices.reward)) ? parseInt(prices.reward) : null,
                unitPrice: prices.unit && !isNaN(parseInt(prices.unit)) ? parseInt(prices.unit) : null,
                pairUnitPrice: prices.pair && !isNaN(parseInt(prices.pair)) ? parseInt(prices.pair) : null
            }))

            const result = await updatePackageTypeAction({
                id: type.id,
                name,
                fee: parseInt(fee),
                ticketCount: parseInt(ticketCount) || 0,
                stripeProductId: stripeProductId.trim(),
                stripePriceId: stripePriceId || undefined,
                selectedLessons: formattedLessons,
                description,
                rules
            })

            if (!result.success) {
                throw new Error(result.error)
            }

            toast.success('パッケージプランを更新しました')
            onOpenChange(false)
            router.refresh()
        } catch (error: any) {
            console.error('Error updating package type:', error)
            toast.error(`更新に失敗しました: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                    <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-amber-600" />
                            パッケージプランの編集
                        </DialogTitle>
                        <DialogDescription>
                            パッケージプランの情報を編集します。標準レッスンや報酬単価、各種レッスン料も変更可能です。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[calc(90vh-160px)]">
                        <div className="grid gap-5">
                            {/* プラン名 */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-pkg-name" className="text-right">
                                    プラン名
                                </Label>
                                <Input
                                    id="edit-pkg-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="col-span-3"
                                    required
                                />
                            </div>

                            {/* 一括料金 */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-pkg-fee" className="text-right">
                                    一括料金（円）
                                </Label>
                                <div className="col-span-3 relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">¥</span>
                                    <Input
                                        id="edit-pkg-fee"
                                        type="number"
                                        value={fee}
                                        onChange={(e) => setFee(e.target.value)}
                                        className="pl-7"
                                        required
                                        min="1"
                                    />
                                </div>
                            </div>

                            {/* チケット枚数 */}
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="edit-pkg-tickets" className="text-right pt-2">
                                    付与チケット数
                                </Label>
                                <div className="col-span-3 space-y-1">
                                    <Input
                                        id="edit-pkg-tickets"
                                        type="number"
                                        value={ticketCount}
                                        onChange={(e) => setTicketCount(e.target.value)}
                                        min="0"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        ※ 決済完了時に自動付与される枚数です。
                                    </p>
                                </div>
                            </div>

                            {/* Stripe Product ID */}
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="edit-pkg-stripe" className="text-right pt-2">
                                    Stripe商品ID
                                </Label>
                                <div className="col-span-3 space-y-1">
                                    <Input
                                        id="edit-pkg-stripe"
                                        value={stripeProductId}
                                        onChange={(e) => setStripeProductId(e.target.value)}
                                        required
                                        className="font-mono text-sm"
                                    />
                                    {type.stripe_price_id && (
                                        <p className="text-xs text-muted-foreground">
                                            価格ID: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">{type.stripe_price_id}</code>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* 説明文 */}
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="edit-pkg-description" className="text-right pt-2">
                                    説明文
                                </Label>
                                <Textarea
                                    id="edit-pkg-description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="col-span-3"
                                    placeholder="入会フォームでプラン選択時に表示されるプランの説明文を入力します。"
                                />
                            </div>

                            {/* 注意事項 */}
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="edit-pkg-rules" className="text-right pt-2">
                                    注意事項 (改行区切り)
                                </Label>
                                <Textarea
                                    id="edit-pkg-rules"
                                    value={rules}
                                    onChange={(e) => setRules(e.target.value)}
                                    className="col-span-3"
                                    placeholder="例：&#13;&#10;コーチの交通費・施設利用料がすべて含まれています。&#13;&#10;振替の有効期間は【2ヶ月間】となります。"
                                    rows={4}
                                />
                            </div>

                            {/* 標準レッスンと報酬計算単価・各種単価の設定 */}
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label className="text-right pt-2">
                                    標準レッスン<br />(複数選択可)
                                </Label>
                                <div className="col-span-3 border rounded-md p-3 max-h-[300px] overflow-y-auto space-y-4 bg-white">
                                    {lessonMasters.map((master) => {
                                        const isChecked = selectedLessons.has(master.id)
                                        return (
                                            <div key={master.id} className="flex flex-col space-y-2 border-b pb-2 last:border-0">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`edit-pkg-lesson-${master.id}`}
                                                        checked={isChecked}
                                                        onCheckedChange={() => toggleLesson(master.id)}
                                                    />
                                                    <label
                                                        htmlFor={`edit-pkg-lesson-${master.id}`}
                                                        className="text-sm font-medium leading-none cursor-pointer flex-1"
                                                    >
                                                        {master.name} <span className="text-gray-400 text-xs">(通常単価: ¥{master.unit_price?.toLocaleString() ?? '—'})</span>
                                                    </label>
                                                </div>

                                                {isChecked && (
                                                    <div className="space-y-3 pl-6 pt-2 animate-in slide-in-from-top-1 duration-200">
                                                        {/* 報酬計算単価 */}
                                                        <div className="flex items-center gap-2">
                                                            <Label htmlFor={`edit-pkg-reward-${master.id}`} className="text-xs text-orange-600 font-bold whitespace-nowrap w-20">
                                                                コーチ報酬:
                                                            </Label>
                                                            <div className="relative w-32">
                                                                <Input
                                                                    id={`edit-pkg-reward-${master.id}`}
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
                                                            <Label htmlFor={`edit-pkg-unit-${master.id}`} className="text-xs text-blue-600 font-bold whitespace-nowrap w-20">
                                                                通常受講料:
                                                            </Label>
                                                            <div className="relative w-32">
                                                                <Input
                                                                    id={`edit-pkg-unit-${master.id}`}
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
                                                            <Label htmlFor={`edit-pkg-pair-${master.id}`} className="text-xs text-green-600 font-bold whitespace-nowrap w-20">
                                                                ペア受講料:
                                                            </Label>
                                                            <div className="relative w-32">
                                                                <Input
                                                                    id={`edit-pkg-pair-${master.id}`}
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
                    </div>
                    <DialogFooter className="p-6 pt-4 border-t bg-slate-50 flex-shrink-0 flex items-center justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700">
                            {loading ? '保存中...' : '保存する'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
