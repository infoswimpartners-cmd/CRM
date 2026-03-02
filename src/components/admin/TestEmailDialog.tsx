
'use client'

import { useState, useEffect } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, MessageSquare, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { sendTestEmail, getTestChatChannels } from '@/actions/email-template'
import { EmailTrigger } from '@/actions/email-template'

interface TestEmailDialogProps {
    templateKey: string
    subject: string
    body: string
    triggers?: EmailTrigger[]
    templateId?: string
}

export function TestEmailDialog({ templateKey, subject, body, triggers = [], templateId }: TestEmailDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    // サーバーから取得したChat設定済みトリガー名リスト
    const [chatChannelNames, setChatChannelNames] = useState<string[]>([])
    const [chatLoading, setChatLoading] = useState(false)

    // ダイアログが開いたときにサーバーサイドでChat設定を確認
    useEffect(() => {
        if (!open) return
        setChatLoading(true)
        getTestChatChannels(templateKey).then(names => {
            setChatChannelNames(names)
            setChatLoading(false)
        }).catch(() => {
            setChatLoading(false)
        })
    }, [open, templateKey])

    const hasChatChannels = chatChannelNames.length > 0

    const handleSend = async () => {
        setLoading(true)
        try {
            const result = await sendTestEmail(templateKey, subject, body, email)
            if (result.success) {
                const channels = result.sentTo?.length
                    ? result.sentTo.join(' & ')
                    : hasChatChannels ? 'Google Chat' : 'メール'
                toast.success(`テスト送信しました（${channels}）`)
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
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>テスト送信</DialogTitle>
                    <DialogDescription>
                        入力中の件名・本文でテスト送信します。変数はダミーデータに置き換えられます。
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Google Chat 送信先の表示 */}
                    {chatLoading ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Google Chat 設定を確認中...
                        </div>
                    ) : hasChatChannels ? (
                        <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
                            <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5" />
                                Google Chat にも送信されます
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {chatChannelNames.map(name => (
                                    <Badge key={name} className="text-[11px] bg-green-100 text-green-800 border-green-300">
                                        {name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                            <MessageSquare className="w-3.5 h-3.5" />
                            Google Chat の設定なし（メールのみ送信）
                        </div>
                    )}

                    {/* メールアドレス入力 */}
                    <div className="space-y-1.5">
                        <Label htmlFor="email" className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-gray-500" />
                            送信先メールアドレス
                            <span className="text-xs text-gray-400 font-normal">（任意・Google Chat設定がある場合は不要）</span>
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder={hasChatChannels ? 'メールにも送る場合は入力（空白でChatのみ）' : 'admin@example.com'}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        キャンセル
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={loading || chatLoading}
                        className="gap-1.5"
                    >
                        {loading
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Send className="h-4 w-4" />
                        }
                        {hasChatChannels && !email ? 'Chatにテスト送信' : '送信する'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
