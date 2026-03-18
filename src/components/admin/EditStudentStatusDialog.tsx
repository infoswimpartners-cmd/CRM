'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { updateStudentStatus } from '@/actions/statuses'
import { cn } from '@/lib/utils'

interface StudentStatus {
    id: string
    name: string
    color_class: string
    is_system?: boolean
}

const bgColors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    blue: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    indigo: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
    purple: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    pink: 'bg-pink-100 text-pink-800 hover:bg-pink-200',
    red: 'bg-red-100 text-red-800 hover:bg-red-200',
    orange: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
    yellow: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    green: 'bg-green-100 text-green-800 hover:bg-green-200',
    teal: 'bg-teal-100 text-teal-800 hover:bg-teal-200',
}

export function EditStudentStatusDialog({ status, open, onOpenChange }: { status: StudentStatus | null, open: boolean, onOpenChange: (o: boolean) => void }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        colorCode: 'gray'
    })

    useEffect(() => {
        if (status) {
            // Find which key in bgColors matches the status color_class
            let matchedKey = 'gray'
            for (const [key, value] of Object.entries(bgColors)) {
                if (status.color_class.includes(value.split(' ')[0])) {
                    matchedKey = key
                    break
                }
            }

            setFormData({
                name: status.name,
                colorCode: matchedKey
            })
        }
    }, [status])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!status) return

        setLoading(true)

        if (!formData.name) {
            toast.error('表示名が入力されていません')
            setLoading(false)
            return
        }

        const color_class = bgColors[formData.colorCode] || bgColors.gray

        try {
            const result = await updateStudentStatus({
                id: status.id,
                name: formData.name,
                color_class: color_class,
            })

            if (result.success) {
                toast.success('顧客ステータスを更新しました')
                onOpenChange(false)
                router.refresh()
            } else {
                toast.error(result.error || '通信エラーが発生しました')
            }
        } catch (error) {
            console.error(error)
            toast.error('変更の保存に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    if (!status) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>ステータスの編集</DialogTitle>
                        <DialogDescription>
                            表示名やカラーを変更します。変更はすべての該当顧客に反映されます。
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>キー (ID)</Label>
                            <Input value={status.id} disabled className="bg-slate-50 cursor-not-allowed" />
                            <p className="text-xs text-slate-500">キーはシステム連携等に使用されるため変更できません。</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">表示名</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                disabled={loading}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>表示カラー</Label>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(bgColors).map(([key, css]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, colorCode: key })}
                                        className={cn(
                                            "h-8 px-3 rounded-full text-xs font-medium cursor-pointer ring-offset-2 transition-shadow",
                                            css,
                                            formData.colorCode === key ? "ring-2 ring-black" : "opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        {formData.name || 'プレビュー'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? '保存中...' : '保存する'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
