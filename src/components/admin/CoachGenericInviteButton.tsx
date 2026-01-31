'use client'

import { Button } from '@/components/ui/button'
import { Link2, Loader2, Check, Copy, UserPlus } from 'lucide-react'
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
    const [inviteUrl, setInviteUrl] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleCreate = async () => {
        setIsPending(true)
        setError(null)
        setInviteUrl(null)

        try {
            const result = await createGenericInvitation()
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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>コーチ登録リンクの発行</DialogTitle>
                    <DialogDescription>
                        氏名やメールアドレスを指定せずに、誰でも登録可能な招待リンクを発行します。<br />
                        <span className="text-xs text-red-500 font-bold">※このリンクを知っている人は誰でもコーチとして登録できてしまうため、取り扱いには十分注意してください。</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {!inviteUrl ? (
                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-slate-50">
                            <UserPlus className="h-10 w-10 text-slate-300 mb-2" />
                            <p className="text-sm text-slate-500 text-center mb-4">
                                新しい登録用リンクを生成します。<br />
                                リンクの有効期限は3日間です。
                            </p>
                            <Button onClick={handleCreate} disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                リンクを生成する
                            </Button>
                            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-green-50 p-4 rounded-lg flex flex-col items-center">
                                <Check className="h-8 w-8 text-green-600 mb-2" />
                                <p className="text-green-800 font-bold">発行しました</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="bg-slate-100 p-2 rounded border flex-1 overflow-hidden">
                                    <code className="text-xs text-slate-600 whitespace-nowrap">
                                        {inviteUrl}
                                    </code>
                                </div>
                                <Button size="icon" onClick={handleCopy}>
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500 text-center">
                                コピーしてチャットツールなどで共有してください。
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
