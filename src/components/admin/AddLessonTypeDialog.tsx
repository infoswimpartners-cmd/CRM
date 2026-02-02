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
    DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus } from 'lucide-react'
import { createLessonMasterAction } from '@/actions/masters'

export function AddLessonTypeDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const [name, setName] = useState('')
    const [price, setPrice] = useState('0')
    const [isTrial, setIsTrial] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const result = await createLessonMasterAction({
                name,
                price: parseInt(price),
                isTrial
            })

            if (!result.success) throw new Error(result.error)

            toast.success('レッスンタイプを追加しました (Stripe連携)')
            setOpen(false)
            setName('')
            setPrice('0')
            setIsTrial(false)
            router.refresh()
        } catch (error: any) {
            console.error('Error adding lesson type:', error.message, error.details, error.hint)
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
                        <DialogTitle>レッスンタイプの追加</DialogTitle>
                        <DialogDescription>
                            新しいレッスンの種類と単価を登録します。
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
                                placeholder="個人レッスン 60分"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="price" className="text-right">
                                単価
                            </Label>
                            <Input
                                id="price"
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="is-trial" className="text-right">
                                体験レッスン
                            </Label>
                            <div className="flex items-center space-x-2 col-span-3">
                                <Checkbox
                                    id="is-trial"
                                    checked={isTrial}
                                    onCheckedChange={(checked) => setIsTrial(checked as boolean)}
                                />
                                <label
                                    htmlFor="is-trial"
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
