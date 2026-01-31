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
import { PlusCircle, Loader2 } from 'lucide-react'
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
    const [state, setState] = useState<{ success?: boolean; error?: string }>({})

    const handleSubmit = async (formData: FormData) => {
        const result = await createCoach({}, formData)
        setState(result)

        if (result.success) {
            setOpen(false)
            setState({}) // Reset on close
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    コーチを追加
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
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
            </DialogContent>
        </Dialog>
    )
}
