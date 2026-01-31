'use client'

import { useState } from 'react'
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
import { PlusCircle, Loader2, Check, Copy, Link2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'
import { createCoach } from '@/app/actions/coach'

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            追加する
        </Button>
    )
}

export function AddCoachDialog() {
    const [open, setOpen] = useState(false)
    const [state, setState] = useState<{ success?: boolean; error?: string; invitationUrl?: string }>({})
    const [copied, setCopied] = useState(false)

    const handleSubmit = async (formData: FormData) => {
        const result = await createCoach({}, formData)
        setState(result)

        // Do not close automatically if success, showing the URL step
    }

    const handleCopy = async () => {
        if (state.invitationUrl) {
            await navigator.clipboard.writeText(state.invitationUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 3000)
        }
    }

    const handleClose = () => {
        setOpen(false)
        setState({}) // Reset on close
        setCopied(false)
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) handleClose()
            else setOpen(true)
        }}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    コーチを追加
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                {!state.success ? (
                    <form action={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>新しいコーチを追加</DialogTitle>
                            <DialogDescription>
                                追加するコーチの情報を入力してください。
                                <br />
                                <span className="text-xs text-muted-foreground">※招待メールが送信されます。コーチはリンクからパスワードを設定して登録を完了します。</span>
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="fullName" className="text-right">
                                    氏名
                                </Label>
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    placeholder="山田 太郎"
                                    className="col-span-3"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="coach@example.com"
                                    className="col-span-3"
                                    required
                                />
                            </div>
                        </div>
                        {state.error && (
                            <p className="text-sm text-red-500 mb-4 text-center">{state.error}</p>
                        )}
                        <DialogFooter>
                            <SubmitButton />
                        </DialogFooter>
                    </form>
                ) : (
                    <div className="space-y-6">
                        <DialogHeader>
                            <div className="mx-auto bg-green-100 p-3 rounded-full mb-4">
                                <Check className="h-6 w-6 text-green-600" />
                            </div>
                            <DialogTitle className="text-center">コーチを追加しました</DialogTitle>
                            <DialogDescription className="text-center">
                                招待メールが送信されました。<br />以下のリンクを直接共有することも可能です。
                            </DialogDescription>
                        </DialogHeader>

                        <div className="bg-slate-50 p-4 rounded-lg border flex items-center gap-3">
                            <div className="bg-white p-2 rounded border">
                                <Link2 className="h-4 w-4 text-slate-400" />
                            </div>
                            <code className="flex-1 text-xs text-slate-600 break-all font-mono">
                                {state.invitationUrl}
                            </code>
                            <Button
                                size="icon"
                                variant="outline"
                                className="shrink-0"
                                onClick={handleCopy}
                            >
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>

                        <DialogFooter className="sm:justify-center">
                            <Button onClick={handleClose} className="w-full sm:w-auto">
                                閉じる
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
