
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

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
    // 送信タイプ: 'normal' (通常メール/Chat) または 'line' (テスト太郎宛LINE)
    const [sendType, setSendType] = useState<'normal' | 'line'>('normal')
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
            const sendToTaro = sendType === 'line'
            const targetEmail = sendToTaro ? '' : email
            const result = await sendTestEmail(templateKey, subject, body, targetEmail, sendToTaro)
            if (result.success) {
                const channels = result.sentTo?.length
                    ? result.sentTo.join(' & ')
                    : sendToTaro ? 'LINE' : hasChatChannels ? 'Google Chat' : 'メール'
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
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle className="text-sm font-bold text-slate-900">テスト送信</DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        入力中の件名・本文でテスト送信します。変数はダミーデータに置き換えられます。
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-3">
                    {/* 送信方法の選択 */}
                    <div className="space-y-2.5">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">送信方法を選択</Label>
                        <RadioGroup
                            value={sendType}
                            onValueChange={(val) => setSendType(val as 'normal' | 'line')}
                            className="grid grid-cols-1 gap-2.5"
                        >
                            {/* 通常送信カード */}
                            <label
                                htmlFor="send-type-normal"
                                className={`flex items-start gap-3 rounded-xl border p-3.5 transition-all cursor-pointer select-none duration-200 ${
                                    sendType === 'normal'
                                        ? 'border-slate-800 bg-slate-50/80 shadow-sm ring-1 ring-slate-800'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/20'
                                }`}
                            >
                                <RadioGroupItem value="normal" id="send-type-normal" className="mt-1" />
                                <div className="space-y-0.5 flex-1">
                                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                                        通常送信（メール / Google Chat）
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-relaxed">
                                        ご指定のメールアドレス、および設定されている Google Chat Webhook にテスト送信を行います。
                                    </p>
                                </div>
                            </label>

                            {/* テスト太郎宛（LINE）カード */}
                            <label
                                htmlFor="send-type-line"
                                className={`flex items-start gap-3 rounded-xl border p-3.5 transition-all cursor-pointer select-none duration-200 ${
                                    sendType === 'line'
                                        ? 'border-emerald-600 bg-emerald-50/20 shadow-sm ring-1 ring-emerald-600'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/20'
                                }`}
                            >
                                <RadioGroupItem value="line" id="send-type-line" className="mt-1" />
                                <div className="space-y-0.5 flex-1">
                                    <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                        テスト太郎宛（LINE優先送信）
                                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-[9px] py-0 px-1.5 h-4.5 font-semibold">LINE連携済</Badge>
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-relaxed">
                                        テスト太郎（会員番号 0035）の LINE アカウント宛てにメッセージを優先して直接送信します。
                                    </p>
                                </div>
                            </label>
                        </RadioGroup>
                    </div>

                    {sendType === 'normal' ? (
                        <div className="space-y-4 pt-1">
                            {/* Google Chat 送信先の表示 */}
                            {chatLoading ? (
                                <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Google Chat 設定を確認中...
                                </div>
                            ) : hasChatChannels ? (
                                <div className="rounded-xl border border-green-200 bg-green-50/30 p-3 space-y-2">
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
                                <Label htmlFor="email" className="flex items-center gap-2 text-xs font-medium text-slate-700">
                                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                                    送信先メールアドレス
                                    <span className="text-[10px] text-gray-400 font-normal">（任意・空白でChatのみ）</span>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder={hasChatChannels ? 'メールにも送る場合は入力' : 'admin@example.com'}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/10 p-3.5 space-y-2 text-emerald-950 pt-3">
                            <p className="text-xs font-bold flex items-center gap-1.5 text-emerald-800">
                                <MessageSquare className="w-4 h-4 text-emerald-600" />
                                LINE優先テスト送信が適用されます
                            </p>
                            <p className="text-[10px] text-emerald-700 leading-relaxed">
                                登録済みのテスト太郎（LINE ID: <code className="bg-emerald-100/50 px-1 py-0.5 rounded text-[9px] font-mono select-all text-emerald-800 font-semibold">U0e5a7654874369ca5e38deb47fd783aa</code>）の LINE 宛てに直接テストメッセージが送信されます。<br />
                                <span className="text-[9px] text-emerald-600 mt-1 block font-medium">※この送信方法では、通常のメール送信および Google Chat への送信はスキップされます。</span>
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={() => setOpen(false)} className="h-9 text-xs">
                        キャンセル
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={loading || chatLoading}
                        className="gap-1.5 h-9 text-xs"
                    >
                        {loading
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Send className="h-4 w-4" />
                        }
                        {sendType === 'line'
                            ? 'テスト太郎にLINE送信'
                            : hasChatChannels && !email
                                ? 'Chatにテスト送信'
                                : '送信する'
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
