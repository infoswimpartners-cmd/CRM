
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
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { sendTestEmail } from '@/actions/email-template'

interface TestEmailDialogProps {
    templateKey: string
    subject: string
    body: string
}

export function TestEmailDialog({ templateKey, subject, body }: TestEmailDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')

    const handleSend = async () => {
        if (!email) {
            toast.error('メールアドレスを入力してください')
            return
        }

        setLoading(true)
        try {
            const result = await sendTestEmail(templateKey, subject, body, email)
            if (result.success) {
                toast.success('テスト送信しました')
                setOpen(false)
            } else {
                toast.error(`送信失敗: ${result.error}`)
            }
        } catch (error) {
            toast.error('エラーが発生しました')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Send className="mr-2 h-4 w-4" />
                    テスト送信
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>テストメール送信</DialogTitle>
                    <DialogDescription>
                        入力中の件名・本文でテストメールを送信します。<br />
                        変数はダミーデータに置き換えられます。
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">送信先メールアドレス</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="admin@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        キャンセル
                    </Button>
                    <Button onClick={handleSend} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        送信する
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
