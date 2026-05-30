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
import { Textarea } from "@/components/ui/textarea"
import { toast } from 'sonner'
import { Plus, Package } from 'lucide-react'
import { createPackageTypeAction } from '@/actions/masters'

interface LessonMaster {
    id: string
    name: string
    active: boolean
    unit_price: number
}

export function AddPackageTypeDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const [name, setName] = useState('')
    const [fee, setFee] = useState('')
    const [ticketCount, setTicketCount] = useState('')
    const [stripeProductId, setStripeProductId] = useState('')
    const [description, setDescription] = useState('')
    const [rules, setRules] = useState('')

    // 標準レッスン・報酬単価設定用のState
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
        if (!name || !fee || !ticketCount || !stripeProductId) {
            toast.error('すべての項目を入力してください')
            return
        }
        setLoading(true)
        try {
            // 選択された標準レッスンと報酬単価の配列化
            const selectedLessonsArray = Array.from(selectedLessons.entries()).map(([lessonId, priceStr]) => ({
                id: lessonId,
                rewardPrice: priceStr && !isNaN(parseInt(priceStr)) ? parseInt(priceStr) : null
            }))

            const result = await createPackageTypeAction({
                name,
                fee: parseInt(fee),
                ticketCount: parseInt(ticketCount),
                stripeProductId: stripeProductId.trim(),
                selectedLessons: selectedLessonsArray,
                description,
                rules
            })

            if (!result.success) {
                throw new Error(result.error)
            }

            toast.success('パッケージプランを追加しました（Stripe連携済み）')
            setOpen(false)
            setName('')
            setFee('')
            setTicketCount('')
            setStripeProductId('')
            setDescription('')
            setRules('')
            setSelectedLessons(new Map())
            router.refresh()
        } catch (error: any) {
            console.error('Error adding package type:', error)
            toast.error(`追加に失敗しました: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> パッケージ追加
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-amber-600" />
                            パッケージプランの追加
                        </DialogTitle>
                        <DialogDescription>
                            一括払いのパッケージプランを登録します。標準レッスンとコーチの報酬計算単価も同時に設定可能です。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-5 py-5">
                        {/* プラン名 */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="pkg-name" className="text-right">
                                プラン名
                            </Label>
                            <Input
                                id="pkg-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                placeholder="例: 25m完泳パッケージ【全12回】"
                                required
                            />
                        </div>

                        {/* 一括料金 */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="pkg-fee" className="text-right">
                                一括料金（円）
                            </Label>
                            <div className="col-span-3 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">¥</span>
                                <Input
                                    id="pkg-fee"
                                    type="number"
                                    value={fee}
                                    onChange={(e) => setFee(e.target.value)}
                                    className="pl-7"
                                    placeholder="例: 102000"
                                    required
                                    min="1"
                                />
                            </div>
                        </div>

                        {/* チケット枚数 */}
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="pkg-tickets" className="text-right pt-2">
                                付与チケット数
                            </Label>
                            <div className="col-span-3 space-y-1">
                                <Input
                                    id="pkg-tickets"
                                    type="number"
                                    value={ticketCount}
                                    onChange={(e) => setTicketCount(e.target.value)}
                                    placeholder="例: 12"
                                    required
                                    min="1"
                                />
                                <p className="text-xs text-muted-foreground">
                                    ※ 決済完了時に自動付与される枚数です。
                                </p>
                            </div>
                        </div>

                        {/* Stripe Product ID */}
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="pkg-stripe-product" className="text-right pt-2">
                                Stripe商品ID
                            </Label>
                            <div className="col-span-3 space-y-1">
                                <Input
                                    id="pkg-stripe-product"
                                    value={stripeProductId}
                                    onChange={(e) => setStripeProductId(e.target.value)}
                                    placeholder="例: prod_UbB6BsLLcaUgjX"
                                    required
                                    className="font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                    StripeのProduct IDを入力してください。one_time価格が自動で紐付けられます。
                                </p>
                            </div>
                        </div>

                        {/* 説明文 */}
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="pkg-description" className="text-right pt-2">
                                説明文
                            </Label>
                            <Textarea
                                id="pkg-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="col-span-3"
                                placeholder="入会フォームでプラン選択時に表示されるプランの説明文を入力します。"
                            />
                        </div>

                        {/* 注意事項 */}
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="pkg-rules" className="text-right pt-2">
                                注意事項 (改行区切り)
                            </Label>
                            <Textarea
                                id="pkg-rules"
                                value={rules}
                                onChange={(e) => setRules(e.target.value)}
                                className="col-span-3"
                                placeholder="例：&#13;&#10;コーチの交通費・施設利用料がすべて含まれています。&#13;&#10;振替の有効期間は【2ヶ月間】となります。"
                                rows={4}
                            />
                        </div>

                        {/* 標準レッスンと報酬計算単価の選択 */}
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right pt-2">
                                標準レッスン
                            </Label>
                            <div className="col-span-3 border rounded-md p-3 h-[250px] overflow-y-auto space-y-4 bg-white">
                                {lessonMasters.map((master) => {
                                    const isChecked = selectedLessons.has(master.id)
                                    return (
                                        <div key={master.id} className="flex flex-col space-y-2 border-b pb-2 last:border-0">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`pkg-lesson-${master.id}`}
                                                    checked={isChecked}
                                                    onCheckedChange={() => toggleLesson(master.id, master.unit_price)}
                                                />
                                                <label
                                                    htmlFor={`pkg-lesson-${master.id}`}
                                                    className="text-sm font-medium leading-none cursor-pointer flex-1"
                                                >
                                                    {master.name} <span className="text-gray-400 text-xs">(通常単価: ¥{master.unit_price.toLocaleString()})</span>
                                                </label>
                                            </div>

                                            {isChecked && (
                                                <div className="flex items-center gap-2 pl-6 animate-in slide-in-from-top-1 duration-200">
                                                    <Label htmlFor={`pkg-price-${master.id}`} className="text-xs text-gray-500 whitespace-nowrap">
                                                        報酬計算単価:
                                                    </Label>
                                                    <div className="relative w-32">
                                                        <Input
                                                            id={`pkg-price-${master.id}`}
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
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700">
                            {loading ? '登録中...' : '登録する'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
