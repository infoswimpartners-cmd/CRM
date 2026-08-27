'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Bot, Link as LinkIcon, Bell, KeyRound, Plus, ExternalLink, Send } from "lucide-react"
import { toast } from "sonner"
import { updateCoachLineFriendUrlAction } from "@/actions/coaches"
import { saveLineBotConfigAction } from "@/actions/line-monitoring"
import { getChatWebhooksAction } from "@/actions/gchat_webhook"
import { WebhookFormDialog } from "@/components/admin/announcements/WebhookFormDialog"
import Link from 'next/link'

interface CoachLineSettingsFormProps {
    coachId: string
    initialLineFriendUrl: string
    initialBotConfig?: {
        id?: string
        bot_id: string
        bot_name: string
        gchat_webhook_id?: string | null
        channel_access_token?: string | null
    } | null
    chatWebhooks?: { id: string; space_name: string; webhook_url?: string }[]
}

export function CoachLineSettingsForm({ 
    coachId, 
    initialLineFriendUrl,
    initialBotConfig,
    chatWebhooks = []
}: CoachLineSettingsFormProps) {
    const [saving, setSaving] = useState(false)
    const [testingWebhook, setTestingWebhook] = useState(false)
    const [url, setUrl] = useState(initialLineFriendUrl || '')
    const [botId, setBotId] = useState(initialBotConfig?.bot_id || '')
    const [botName, setBotName] = useState(initialBotConfig?.bot_name || '')
    const [channelAccessToken, setChannelAccessToken] = useState<string>(initialBotConfig?.channel_access_token || '')
    
    // Webhook関連の状態
    const [webhookList, setWebhookList] = useState<{ id: string; space_name: string; webhook_url?: string }[]>(chatWebhooks)
    const [selectedWebhookId, setSelectedWebhookId] = useState<string>(initialBotConfig?.gchat_webhook_id || 'none')
    
    // 現在選択または紐づいているWebhookの情報
    const currentWebhook = chatWebhooks.find(w => w.id === initialBotConfig?.gchat_webhook_id)
    const [webhookUrl, setWebhookUrl] = useState<string>(currentWebhook?.webhook_url || '')
    const [spaceName, setSpaceName] = useState<string>(currentWebhook?.space_name || '')
    const [dialogOpen, setDialogOpen] = useState(false)

    // プルダウンで既存スペースを選択した時
    const handleSelectSpace = (val: string) => {
        setSelectedWebhookId(val)
        if (val === 'none') {
            setWebhookUrl('')
            setSpaceName('')
        } else {
            const found = webhookList.find(w => w.id === val)
            if (found) {
                setWebhookUrl(found.webhook_url || '')
                setSpaceName(found.space_name || '')
            }
        }
    }

    // Webhook URLが手動入力された時
    const handleWebhookUrlChange = (val: string) => {
        setWebhookUrl(val)
        // 既存のリストに同じURLがあればそれを選択状態にする
        const matched = webhookList.find(w => w.webhook_url === val.trim())
        if (matched) {
            setSelectedWebhookId(matched.id)
            if (!spaceName) setSpaceName(matched.space_name)
        } else {
            setSelectedWebhookId('custom')
            if (!spaceName && botName) {
                setSpaceName(`${botName} 連絡用`)
            }
        }
    }

    const refreshWebhooks = async () => {
        try {
            const res = await getChatWebhooksAction()
            if (res.success) {
                setWebhookList(res.data.filter((w: any) => w.active))
            }
        } catch (e) {
            console.error('Failed to refresh webhooks', e)
        }
    }

    // Webhookテスト送信
    const handleTestWebhook = async () => {
        if (!webhookUrl.trim()) {
            toast.error('テスト送信するWebhook URLを入力してください')
            return
        }
        if (!webhookUrl.startsWith('https://chat.googleapis.com/')) {
            toast.error('Google Chatの有効なWebhook URLを入力してください (https://chat.googleapis.com/...)')
            return
        }

        setTestingWebhook(true)
        try {
            const response = await fetch(webhookUrl.trim(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `🔔 *【Swim Partners】Google Chat通知テスト*\n\n「${botName || 'コーチ'}」の連絡用Webhookが正常に接続されました。\n（前日レッスンリマインドやLINE調整検知時にこのスペースへ通知されます）`
                })
            })

            if (response.ok) {
                toast.success('Google Chatスペースへテスト通知を送信しました！')
            } else {
                toast.error(`送信に失敗しました (ステータス: ${response.status})`)
            }
        } catch (e: any) {
            console.error('Test Webhook Error:', e)
            toast.error('テスト送信中にエラーが発生しました: ' + (e.message || ''))
        } finally {
            setTestingWebhook(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            // 1. LINE友達追加URLの更新
            const result = await updateCoachLineFriendUrlAction(coachId, url.trim())
            if (!result.success) throw new Error(result.error)

            // 2. ボットIDまたはボット表示名またはWebhookが入力されている場合はボット設定も更新
            if (botId.trim() || botName.trim() || webhookUrl.trim() || channelAccessToken.trim()) {
                if (!botId.trim() || !botName.trim()) {
                    throw new Error('公式LINE連携や通知設定を行う場合は「ボット表示名」と「ボットID / ベーシックID」の両方を入力してください。')
                }

                const botResult = await saveLineBotConfigAction({
                    id: initialBotConfig?.id,
                    coach_id: coachId,
                    bot_id: botId.trim(),
                    bot_name: botName.trim(),
                    gchat_webhook_id: selectedWebhookId === 'none' ? null : (selectedWebhookId === 'custom' ? null : selectedWebhookId),
                    custom_webhook_url: webhookUrl.trim() || null,
                    custom_space_name: spaceName.trim() || null,
                    channel_access_token: channelAccessToken.trim() || null
                })

                if (!botResult.success) {
                    throw new Error(botResult.error)
                }
            }

            toast.success('LINE設定およびコーチ連絡用Webhook設定を保存しました')
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || '更新に失敗しました')
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* 1. LINE友達追加URL */}
                <div className="space-y-2">
                    <Label htmlFor="line_friend_url" className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <LinkIcon className="h-4 w-4 text-emerald-600" />
                        LINE友達追加URL
                    </Label>
                    <Input
                        id="line_friend_url"
                        type="url"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="例: https://line.me/ti/p/..."
                    />
                    <p className="text-xs text-slate-400">
                        ※アサイン確定時の通知メッセージに挿入される、コーチ個人のLINE友達追加URLです。
                    </p>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-4">
                    <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-indigo-600" />
                        <h4 className="text-sm font-bold text-slate-800">公式LINE日程調整監視＆自動連絡設定</h4>
                    </div>

                    {/* 2. ボット表示名 */}
                    <div className="space-y-2">
                        <Label htmlFor="bot_name" className="text-xs font-medium text-slate-600">ボット表示名</Label>
                        <Input
                            id="bot_name"
                            value={botName}
                            onChange={e => setBotName(e.target.value)}
                            placeholder="例: 岡野コーチ公式LINE"
                        />
                    </div>

                    {/* 3. ボットID / ベーシックID */}
                    <div className="space-y-2">
                        <Label htmlFor="bot_id" className="text-xs font-medium text-slate-600">
                            ボットID または ベーシックID
                        </Label>
                        <Input
                            id="bot_id"
                            value={botId}
                            onChange={e => setBotId(e.target.value)}
                            placeholder="例: @766pzpvi または U12345..."
                        />
                        <p className="text-xs text-slate-400">
                            ※LINE管理画面のベーシックID（@...）またはLINE DevelopersのボットユーザーID（U...）を入力します。
                        </p>
                    </div>

                    {/* 4. チャネルアクセストークン（長期） */}
                    <div className="space-y-2">
                        <Label htmlFor="channel_access_token" className="flex items-center gap-1 text-xs font-medium text-slate-600">
                            <KeyRound className="h-3.5 w-3.5 text-indigo-600" />
                            チャネルアクセストークン（長期）
                        </Label>
                        <Input
                            id="channel_access_token"
                            type="password"
                            value={channelAccessToken}
                            onChange={e => setChannelAccessToken(e.target.value)}
                            placeholder="LINE Developersで発行した長期トークンを貼り付け"
                            className="font-mono text-xs"
                        />
                        <p className="text-xs text-slate-400 leading-relaxed">
                            ※このコーチの公式LINEから生徒へ **前日連絡を自動送信（プッシュ通知）** するために使用します。（LINE Developersの「Messaging API設定」タブ下部より取得）
                        </p>
                    </div>

                    {/* 5. コーチ専用 Google Chat Webhook設定 */}
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                <Bell className="h-4 w-4 text-indigo-600" />
                                コーチ連絡用 Google Chat Webhook 設定
                            </Label>
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/admin/webhooks"
                                    target="_blank"
                                    className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                                >
                                    Webhookマスタ管理 <ExternalLink className="h-2.5 w-2.5" />
                                </Link>
                            </div>
                        </div>

                        {/* 登録済みスペースからの選択（任意） */}
                        <div className="space-y-1">
                            <Label className="text-[11px] text-slate-500 font-medium">登録済みスペースから選択（任意）</Label>
                            <Select value={selectedWebhookId} onValueChange={handleSelectSpace}>
                                <SelectTrigger className="bg-white h-8 text-xs">
                                    <SelectValue placeholder="登録済みスペースから選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">指定なし (未設定)</SelectItem>
                                    {selectedWebhookId === 'custom' && (
                                        <SelectItem value="custom">直接入力されたURLを使用中</SelectItem>
                                    )}
                                    {webhookList.map(webhook => (
                                        <SelectItem key={webhook.id} value={webhook.id}>
                                            {webhook.space_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Webhook URL 直接入力 */}
                        <div className="space-y-1.5">
                            <Label htmlFor="coach_webhook_url" className="text-[11px] font-semibold text-slate-700">
                                Webhook URL（このコーチ専用の通知先URL）
                            </Label>
                            <Input
                                id="coach_webhook_url"
                                type="url"
                                value={webhookUrl}
                                onChange={e => handleWebhookUrlChange(e.target.value)}
                                placeholder="https://chat.googleapis.com/v1/spaces/..."
                                className="bg-white font-mono text-xs h-9"
                            />
                            <p className="text-[10px] text-slate-400">
                                ※Google Chatのスペース設定 ＞ 「アプリと統合」 ＞ 「Webhook」から生成されたURLを貼り付けます。
                            </p>
                        </div>

                        {/* スペース表示名 */}
                        {webhookUrl && (
                            <div className="space-y-1.5 pt-1">
                                <Label htmlFor="coach_space_name" className="text-[11px] font-semibold text-slate-700">
                                    スペース表示名（マスタ登録用）
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="coach_space_name"
                                        value={spaceName}
                                        onChange={e => setSpaceName(e.target.value)}
                                        placeholder="例: 岡野コーチ連絡用スペース"
                                        className="bg-white text-xs h-8 flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleTestWebhook}
                                        disabled={testingWebhook || !webhookUrl}
                                        className="h-8 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                    >
                                        {testingWebhook ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                        テスト送信
                                    </Button>
                                </div>
                            </div>
                        )}

                        <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                            ※前日のレッスン予定リマインド（前日Cron）および公式LINEの日程調整検知時に、このスペースへ自動通知されます。
                        </p>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        LINE・通知設定を保存
                    </Button>
                </div>
            </form>

            <WebhookFormDialog
                webhook={null}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSuccess={refreshWebhooks}
            />
        </>
    )
}

