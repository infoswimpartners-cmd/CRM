'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound, Loader2, RefreshCcw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { adminResetCoachPassword } from '@/app/actions/adminResetCoachPassword'

interface AdminResetPasswordDialogProps {
    coachId: string
    coachName: string
}

export function AdminResetPasswordDialog({ coachId, coachName }: AdminResetPasswordDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [newPassword, setNewPassword] = useState('')

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword.length < 6) {
            toast.error('パスワードは6文字以上で入力してください')
            return
        }

        setLoading(true)
        try {
            const result = await adminResetCoachPassword(coachId, newPassword)
            if (result.success) {
                toast.success('パスワードを変更しました')
                setOpen(false)
                setNewPassword('')
            } else {
                toast.error(result.error)
            }
        } catch (err) {
            toast.error('エラーが発生しました')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50">
                    <KeyRound className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-indigo-700">
                        <RefreshCcw className="h-5 w-5" />
                        パスワードの強制変更
                    </DialogTitle>
                    <DialogDescription>
                        {coachName} さんのログインパスワードを強制的に変更します。<br />
                        <span className="text-red-500 font-bold text-xs mt-2 block">
                            ※変更後は、必ず新しいパスワードをご本人にお伝えください。
                        </span>
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleReset} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">新しいパスワード</Label>
                        <Input
                            id="new-password"
                            type="text"
                            placeholder="6文字以上の英数字"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                        <p className="text-xs text-slate-500">
                            ※セキュリティのため、推測されにくいパスワードを設定してください。
                        </p>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={loading || newPassword.length < 6} className="bg-indigo-600 hover:bg-indigo-700">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            変更する
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
