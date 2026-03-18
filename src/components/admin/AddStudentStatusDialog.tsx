'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createStudentStatus } from '@/actions/statuses'
import { cn } from '@/lib/utils'

export function AddStudentStatusDialog() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        colorCode: 'blue' // simpler proxy for tailwind class
    })

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        if (!formData.id || !formData.name) {
            toast.error('必須項目が入力されていません')
            setLoading(false)
            return
        }

        const color_class = bgColors[formData.colorCode] || bgColors.gray

        try {
            const result = await createStudentStatus({
                id: formData.id,
                name: formData.name,
                color_class: color_class,
            })

            if (result.success) {
                toast.success('顧客ステータスを追加しました')
                setOpen(false)
                setFormData({ id: '', name: '', colorCode: 'blue' })
                router.refresh()
            } else {
                toast.error(result.error || 'エラーが発生しました')
            }
        } catch (error) {
            console.error(error)
            toast.error('通信エラーが発生しました')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> 新規ステータス
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>顧客ステータスの追加</DialogTitle>
                        <DialogDescription>
                            管理用のキー（半角英数）と表示名、カラーを選択してください。
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="id">キー (ID)</Label>
                            <Input
                                id="id"
                                placeholder="例: pre_registration"
                                value={formData.id}
                                onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                                disabled={loading}
                            />
                            <p className="text-xs text-slate-500">半角英小文字、数字、アンダースコアのみ。一度設定すると変更できません。</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="name">表示名</Label>
                            <Input
                                id="name"
                                placeholder="例: 仮登録"
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
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? '保存中...' : '追加する'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
