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
    DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus } from 'lucide-react'
import { createFacilityAction } from '@/actions/facilities'

export function AddFacilityDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const [name, setName] = useState('')
    const [isFacilityFeeApplied, setIsFacilityFeeApplied] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const result = await createFacilityAction({
                name,
                isFacilityFeeApplied
            })

            if (!result.success) throw new Error(result.error)

            toast.success('施設を追加しました')
            setOpen(false)
            setName('')
            setIsFacilityFeeApplied(false)
            window.location.reload()
        } catch (error: any) {
            console.error('Error adding facility:', error)
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
                        <DialogTitle>施設の追加</DialogTitle>
                        <DialogDescription>
                            利用する施設と、施設利用料の適用有無を登録します。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                施設名
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                placeholder="〇〇市民プール"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="is-fee-applied" className="text-right">
                                施設利用料
                            </Label>
                            <div className="flex items-center space-x-2 col-span-3">
                                <Checkbox
                                    id="is-fee-applied"
                                    checked={isFacilityFeeApplied}
                                    onCheckedChange={(checked) => setIsFacilityFeeApplied(checked as boolean)}
                                />
                                <label
                                    htmlFor="is-fee-applied"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    施設利用料（+1,500円）を適用する
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
