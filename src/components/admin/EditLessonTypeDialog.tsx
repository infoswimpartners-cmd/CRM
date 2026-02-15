'use client'

import { useState } from 'react'
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
import { toast } from 'sonner'

import { Checkbox } from '@/components/ui/checkbox'

interface LessonMaster {
    id: string
    name: string
    unit_price: number
    active: boolean
    is_trial?: boolean
}

interface EditLessonTypeDialogProps {
    master: LessonMaster
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditLessonTypeDialog({ master, open, onOpenChange }: EditLessonTypeDialogProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const [name, setName] = useState(master.name)
    const [price, setPrice] = useState(master.unit_price.toString())
    const [isTrial, setIsTrial] = useState(master.is_trial || false)
    const [stripeProductId, setStripeProductId] = useState((master as any).stripe_product_id || '')
    const [stripePriceId, setStripePriceId] = useState((master as any).stripe_price_id || '')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()

        try {
            const { error } = await supabase
                .from('lesson_masters')
                .update({
                    name,
                    unit_price: parseInt(price),
                    is_trial: isTrial,
                    stripe_product_id: stripeProductId || null,
                    stripe_price_id: stripePriceId || null,
                })
                .eq('id', master.id)

            if (error) throw error

            toast.success('レッスンタイプを更新しました')
            onOpenChange(false)
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error('更新に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>レッスンタイプの編集</DialogTitle>
                        <DialogDescription>
                            レッスンの内容を変更します。
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
                            <Label htmlFor="edit-price" className="text-right">
                                単価
                            </Label>
                            <Input
                                id="edit-price"
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="col-span-3"
                                required
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
                            <Label htmlFor="edit-is-trial" className="text-right">
                                体験レッスン
                            </Label>
                            <div className="flex items-center space-x-2 col-span-3">
                                <Checkbox
                                    id="edit-is-trial"
                                    checked={isTrial}
                                    onCheckedChange={(checked) => setIsTrial(checked as boolean)}
                                />
                                <label
                                    htmlFor="edit-is-trial"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    体験レッスンとして扱う
                                </label>
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
