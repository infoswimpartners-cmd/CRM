'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { createChatWebhookAction, updateChatWebhookAction, ChatWebhook } from '@/actions/gchat_webhook'

interface WebhookFormDialogProps {
    webhook: ChatWebhook | null // nullの場合は新規作成
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function WebhookFormDialog({ webhook, open, onOpenChange, onSuccess }: WebhookFormDialogProps) {
    const [loading, setLoading] = useState(false)
    const [spaceName, setSpaceName] = useState('')
    const [webhookUrl, setWebhookUrl] = useState('')
    const [active, setActive] = useState(true)

    // 編集モード時の初期値セット
    useEffect(() => {
        if (webhook) {
            setSpaceName(webhook.space_name)
            setWebhookUrl(webhook.webhook_url)
            setActive(webhook.active)
        } else {
            setSpaceName('')
            setWebhookUrl('')
            setActive(true)
        }
    }, [webhook, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!spaceName.trim() || !webhookUrl.trim()) {
            toast.error('すべての項目を入力してください')
            return
        }

        if (!webhookUrl.startsWith('https://chat.googleapis.com/')) {
            toast.error('Google Chatの有効なWebhook URLを入力してください (https://chat.googleapis.com/...)')
            return
        }

        setLoading(true)
        try {
            if (webhook) {
                // 編集更新
                const res = await updateChatWebhookAction({
                    id: webhook.id,
                    space_name: spaceName.trim(),
                    webhook_url: webhookUrl.trim(),
                    active
                })
                if (!res.success) throw new Error(res.error)
                toast.success('Webhook設定を更新しました')
            } else {
                // 新規作成
                const res = await createChatWebhookAction({
                    space_name: spaceName.trim(),
                    webhook_url: webhookUrl.trim()
                })
                if (!res.success) throw new Error(res.error)
                toast.success('Webhook設定を新規登録しました')
            }

            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            console.error('Webhook Save Error:', error)
            toast.error(`保存に失敗しました: ${error.message || '不明なエラー'}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <DialogHeader>
                        <DialogTitle>{webhook ? 'Google Chat Webhook編集' : 'Google Chat Webhook登録'}</DialogTitle>
                        <DialogDescription>
                            お知らせ公開時に通知を配信するGoogle Chatのスペース情報を設定します。
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="space-name" className="text-left font-semibold">
                                スペース名（表示用）
                            </Label>
                            <Input
                                id="space-name"
                                value={spaceName}
                                onChange={(e) => setSpaceName(e.target.value)}
                                placeholder="例：【全体周知】連絡用、コーチ板"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="webhook-url" className="text-left font-semibold">
                                Webhook URL
                            </Label>
                            <Input
                                id="webhook-url"
                                value={webhookUrl}
                                onChange={(e) => setWebhookUrl(e.target.value)}
                                placeholder="https://chat.googleapis.com/v1/spaces/..."
                                required
                                disabled={loading}
                                className="font-mono text-xs"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                ※Google Chatのスペース設定 ＞ 「アプリと統合」 ＞ 「Webhook」から生成されたURLを貼り付けてください。
                            </p>
                        </div>

                        {webhook && (
                            <div className="flex items-center justify-between border-t pt-3 mt-1">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-semibold">有効状態</Label>
                                    <p className="text-xs text-muted-foreground">
                                        無効にするとお知らせ作成時の配信先リストから除外されます。
                                    </p>
                                </div>
                                <Switch
                                    checked={active}
                                    onCheckedChange={setActive}
                                    disabled={loading}
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? '保存中...' : '保存'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
