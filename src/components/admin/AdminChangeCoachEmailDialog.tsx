'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Loader2, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { adminChangeCoachEmail } from '@/app/actions/adminChangeCoachEmail'
import { detectDomainTypo, sanitizeEmail } from '@/lib/utils/emailValidation'

interface AdminChangeCoachEmailDialogProps {
    coachId: string
    coachName: string
    currentEmail: string
    triggerVariant?: 'default' | 'outline' | 'ghost'
    triggerSize?: 'default' | 'sm' | 'icon'
    showLabel?: boolean
}

export function AdminChangeCoachEmailDialog({
    coachId,
    coachName,
    currentEmail,
    triggerVariant = 'outline',
    triggerSize = 'sm',
    showLabel = true,
}: AdminChangeCoachEmailDialogProps) {
    const [open, setOpen] = useState(false)
    const [newEmail, setNewEmail] = useState('')
    const [confirmEmail, setConfirmEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // ドメインタイポ検知
    const typoInfo = newEmail ? detectDomainTypo(newEmail) : { hasTypo: false }

    const handleApplySuggestion = () => {
        if (typoInfo.suggestedEmail) {
            setNewEmail(typoInfo.suggestedEmail)
            setConfirmEmail(typoInfo.suggestedEmail)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        const sanitizedNew = sanitizeEmail(newEmail)
        const sanitizedConfirm = sanitizeEmail(confirmEmail)

        if (!sanitizedNew) {
            setError('新しいメールアドレスを入力してください。')
            return
        }

        if (sanitizedNew !== sanitizedConfirm) {
            setError('入力されたメールアドレスが一致しません。')
            return
        }

        if (sanitizedNew.toLowerCase() === currentEmail.toLowerCase()) {
            setError('現在登録されているメールアドレスと同じです。')
            return
        }

        setLoading(true)
        try {
            const res = await adminChangeCoachEmail(coachId, sanitizedNew)
            if (res.success) {
                toast.success(`${coachName} さんのメールアドレスを「${res.updatedEmail}」に変更しました`)
                setOpen(false)
                setNewEmail('')
                setConfirmEmail('')
            } else {
                setError(res.error || 'メールアドレスの変更に失敗しました。')
            }
        } catch (err: any) {
            setError('エラーが発生しました: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        if (!isOpen) {
            setNewEmail('')
            setConfirmEmail('')
            setError(null)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant={triggerVariant}
                    size={triggerSize}
                    className="gap-1.5 text-xs"
                    title="メールアドレスを変更"
                >
                    <Mail className="h-3.5 w-3.5" />
                    {showLabel && <span>メールアドレス変更</span>}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Mail className="h-5 w-5 text-blue-600" />
                            <span>メールアドレスの変更</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm">
                            {coachName} さんのログイン用メールアドレスを変更します。<br />
                            誤登録の修正や、アドレス変更によるログイン手続きの滞りを解消できます。
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4 text-xs sm:text-sm">
                        {/* 現在のアドレス */}
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-xs text-slate-500 block">現在の登録メールアドレス:</span>
                            <span className="font-mono font-medium text-slate-800 break-all">{currentEmail}</span>
                        </div>

                        {/* 新しいメールアドレス */}
                        <div className="space-y-1.5">
                            <Label htmlFor="new_coach_email" className="text-xs font-semibold text-slate-700">
                                新しいメールアドレス <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="new_coach_email"
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="coach@example.com"
                                required
                                className="h-10 text-xs sm:text-sm font-mono"
                                autoCapitalize="none"
                                autoComplete="off"
                            />
                        </div>

                        {/* タイポ注意喚起 */}
                        {typoInfo.hasTypo && typoInfo.suggestedEmail && (
                            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                    <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                                    <span>もしかして: <strong>{typoInfo.suggestedEmail}</strong> ですか？</span>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleApplySuggestion}
                                    className="h-7 text-xs px-2 bg-white border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0"
                                >
                                    反映する
                                </Button>
                            </div>
                        )}

                        {/* 新しいメールアドレス（確認） */}
                        <div className="space-y-1.5">
                            <Label htmlFor="confirm_coach_email" className="text-xs font-semibold text-slate-700">
                                新しいメールアドレス（確認用再入力） <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="confirm_coach_email"
                                type="email"
                                value={confirmEmail}
                                onChange={(e) => setConfirmEmail(e.target.value)}
                                placeholder="もう一度入力してください"
                                required
                                className="h-10 text-xs sm:text-sm font-mono"
                                autoCapitalize="none"
                                autoComplete="off"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            キャンセル
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    更新中...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    メールアドレスを変更する
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
