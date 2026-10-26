'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link2, Loader2, Check, Copy, UserPlus, MessageCircle, AlertCircle } from 'lucide-react'
import { createGenericInvitation } from '@/app/actions/auth-signup'
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

export function CoachGenericInviteButton() {
    const [open, setOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)
    const [lineAdminInviteUrl, setLineAdminInviteUrl] = useState('')
    const [inviteUrl, setInviteUrl] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleCreate = async () => {
        setIsPending(true)
        setError(null)
        setInviteUrl(null)

        try {
            const result = await createGenericInvitation(lineAdminInviteUrl)
            if (result.success && result.url) {
                setInviteUrl(result.url)
            } else {
                setError(result.error || '作成に失敗しました')
            }
        } catch (err) {
            setError('エラーが発生しました')
        } finally {
            setIsPending(false)
        }
    }

    const handleCopy = async () => {
        if (inviteUrl) {
            await navigator.clipboard.writeText(inviteUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 3000)
        }
    }

    const handleOpenOption = (val: boolean) => {
        setOpen(val)
        if (!val) {
            // Reset state on close
            setInviteUrl(null)
            setError(null)
            setCopied(false)
            setLineAdminInviteUrl('')
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenOption}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Link2 className="mr-2 h-4 w-4" />
                    登録リンクを発行
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg p-4 sm:p-6">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="text-base sm:text-lg font-bold">コーチ登録リンクの発行</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm leading-relaxed text-slate-600">
                        <span className="inline-block">氏名やメールを指定せずに登録できる</span>
                        <span className="inline-block">招待リンクを発行します。</span><br />
                        <span className="text-[11px] text-red-500 font-semibold inline-block mt-0.5">※取り扱いには十分注意してください。</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-3 sm:py-4 space-y-4">
                    {!inviteUrl ? (
                        <div className="space-y-4">
                            <div className="p-3.5 sm:p-4 rounded-lg border bg-emerald-50/50 border-emerald-200 space-y-2">
                                <Label htmlFor="line-invite-url" className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 leading-snug">
                                    <MessageCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>公式LINE 管理者招待URL（任意・推奨）</span>
                                </Label>
                                <Input
                                    id="line-invite-url"
                                    placeholder="https://line.me/R/ti/p/..."
                                    value={lineAdminInviteUrl}
                                    onChange={(e) => setLineAdminInviteUrl(e.target.value)}
                                    className="h-9 text-xs bg-white"
                                />
                                <p className="text-[11px] text-emerald-700 leading-relaxed">
                                    <span className="inline-block">入力すると、コーチの初期設定画面（STEP 4）に</span>
                                    <span className="inline-block"><strong>「管理者に追加する」ボタンが自動表示</strong>されます。</span>
                                </p>
                            </div>

                            <div className="flex flex-col items-center justify-center p-5 sm:p-6 border-2 border-dashed rounded-lg bg-slate-50 text-center">
                                <UserPlus className="h-9 w-9 text-slate-300 mb-2 shrink-0" />
                                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                                    <span className="inline-block">新しい登録用リンクを生成します。</span>
                                    <span className="inline-block">（有効期限: 3日間）</span>
                                </p>
                                <Button onClick={handleCreate} disabled={isPending} className="whitespace-nowrap h-10 px-5 text-xs sm:text-sm font-bold">
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    登録リンクを生成する
                                </Button>
                                {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-green-50 p-4 rounded-lg flex flex-col items-center">
                                <Check className="h-8 w-8 text-green-600 mb-2" />
                                <p className="text-green-800 font-bold">登録リンクを発行しました</p>
                                {lineAdminInviteUrl && (
                                    <span className="text-xs text-green-700 mt-1">
                                        ✓ 公式LINE管理者招待URLが紐付けられました
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 w-full">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex-1 min-w-0 break-all">
                                    <code className="text-xs text-slate-600 select-all font-mono break-all whitespace-pre-wrap">
                                        {inviteUrl}
                                    </code>
                                </div>
                                <Button size="icon" variant="outline" onClick={handleCopy} className="shrink-0 h-10 w-10">
                                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500 text-center">
                                コピーして面談後のコーチへ案内してください。
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between">
                    <Button variant="ghost" onClick={() => handleOpenOption(false)}>
                        閉じる
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
