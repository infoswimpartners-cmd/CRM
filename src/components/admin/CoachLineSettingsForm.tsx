'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Bot, Link as LinkIcon, Bell, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { updateCoachLineFriendUrlAction } from "@/actions/coaches"
import { saveLineBotConfigAction } from "@/actions/line-monitoring"

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
    chatWebhooks?: { id: string; space_name: string }[]
}

export function CoachLineSettingsForm({ 
    coachId, 
    initialLineFriendUrl,
    initialBotConfig,
    chatWebhooks = []
}: CoachLineSettingsFormProps) {
    const [saving, setSaving] = useState(false)
    const [url, setUrl] = useState(initialLineFriendUrl || '')
    const [botId, setBotId] = useState(initialBotConfig?.bot_id || '')
    const [botName, setBotName] = useState(initialBotConfig?.bot_name || '')
    const [gchatWebhookId, setGchatWebhookId] = useState<string>(initialBotConfig?.gchat_webhook_id || 'none')
    const [channelAccessToken, setChannelAccessToken] = useState<string>(initialBotConfig?.channel_access_token || '')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            // 1. LINE友達追加URLの更新
            const result = await updateCoachLineFriendUrlAction(coachId, url.trim())
            if (!result.success) throw new Error(result.error)

            // 2. ボットIDまたはボット表示名が入力されている場合はボット設定も更新
            if (botId.trim() || botName.trim()) {
                if (!botId.trim() || !botName.trim()) {
                    throw new Error('ボット設定を行う場合は「ボット表示名」と「ボットID / ベーシックID」の両方を入力してください。')
                }

                const botResult = await saveLineBotConfigAction({
                    id: initialBotConfig?.id,
                    coach_id: coachId,
                    bot_id: botId.trim(),
                    bot_name: botName.trim(),
                    gchat_webhook_id: gchatWebhookId === 'none' ? null : (gchatWebhookId || null),
                    channel_access_token: channelAccessToken.trim() || null
                })

                if (!botResult.success) {
                    throw new Error(botResult.error)
                }
            }

            toast.success('LINE設定およびボット連携設定を保存しました')
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || '更新に失敗しました')
        } finally {
            setSaving(false)
        }
    }

    return (
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

                {/* 5. 通知先 Google Chat スペース */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs font-medium text-slate-600">
                        <Bell className="h-3.5 w-3.5 text-indigo-500" />
                        連絡・通知先 Google Chat スペース
                    </Label>
                    <Select value={gchatWebhookId} onValueChange={setGchatWebhookId}>
                        <SelectTrigger>
                            <SelectValue placeholder="通知先のスペースを選択" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">指定なし (既定のスペースへ通知)</SelectItem>
                            {chatWebhooks.map(webhook => (
                                <SelectItem key={webhook.id} value={webhook.id}>
                                    {webhook.space_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-400">
                        ※LINE日程調整検知時および **前日のレッスン予定リマインド** を送信するコーチ専用スペースを選択します。
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
    )
}
