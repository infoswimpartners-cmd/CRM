'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Plus, Settings2, Trash2, Megaphone, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { getChatWebhooksAction, deleteChatWebhookAction, ChatWebhook } from '@/actions/gchat_webhook'
import { WebhookFormDialog } from '@/components/admin/announcements/WebhookFormDialog'

export default function ChatWebhookManagementPage() {
    const [loading, setLoading] = useState(true)
    const [webhooks, setWebhooks] = useState<ChatWebhook[]>([])
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedWebhook, setSelectedWebhook] = useState<ChatWebhook | null>(null)

    const fetchWebhooks = async () => {
        setLoading(true)
        try {
            const res = await getChatWebhooksAction()
            if (res.success) {
                setWebhooks(res.data)
            } else {
                toast.error(res.error || 'Webhookの取得に失敗しました')
            }
        } catch (error) {
            console.error('Fetch Webhooks Error:', error)
            toast.error('データの読み込み中にエラーが発生しました')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchWebhooks()
    }, [])

    const handleAddClick = () => {
        setSelectedWebhook(null)
        setDialogOpen(true)
    }

    const handleEditClick = (webhook: ChatWebhook) => {
        setSelectedWebhook(webhook)
        setDialogOpen(true)
    }

    const handleDeleteClick = async (id: string, name: string) => {
        if (!confirm(`本当に「${name}」の連携設定を削除しますか？\n※この操作は取り消せません。`)) {
            return
        }

        try {
            const res = await deleteChatWebhookAction(id)
            if (res.success) {
                toast.success('連携設定を削除しました')
                fetchWebhooks()
            } else {
                toast.error(res.error || '削除に失敗しました')
            }
        } catch (error) {
            console.error('Delete Webhook Error:', error)
            toast.error('削除処理中にエラーが発生しました')
        }
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* 戻るボタン & ヘッダー */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <Button variant="ghost" className="pl-0 gap-2 mb-2 hover:bg-transparent hover:text-indigo-600" asChild>
                        <Link href="/admin/announcements">
                            <ChevronLeft className="h-4 w-4" /> お知らせ管理に戻る
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                        <Megaphone className="h-8 w-8 text-indigo-600" />
                        Google Chat連携マスタ設定
                    </h1>
                    <p className="text-sm text-muted-foreground pl-1">
                        お知らせの投稿時に自動配信できるGoogle Chat Webhookスペースを登録・管理します。
                    </p>
                </div>

                <Button onClick={handleAddClick} className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md transform hover:scale-[1.02] transition-all">
                    <Plus className="h-4 w-4" /> Webhookを新規登録
                </Button>
            </div>

            {/* 一覧表示 */}
            <Card className="border-slate-100 shadow-xl overflow-hidden rounded-2xl bg-white/70 backdrop-blur-md">
                <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
                    <CardTitle className="text-lg font-bold text-slate-800">
                        登録済みの連携Webhook一覧
                    </CardTitle>
                    <CardDescription>
                        有効になっているWebhookは、お知らせ作成時の「配信先Google Chat」の選択肢に表示されます。
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                            <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
                            <span className="text-sm font-medium">データを読み込み中...</span>
                        </div>
                    ) : webhooks.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 space-y-3">
                            <Settings2 className="h-16 w-16 text-slate-300 mx-auto" />
                            <p className="font-semibold text-slate-500">Google Chat Webhookが登録されていません</p>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                右上の「Webhookを新規登録」ボタンから、通知を送りたいGoogle ChatのスペースWebhook URLを追加してください。
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {webhooks.map((webhook) => (
                                <div
                                    key={webhook.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-slate-50/80 transition-colors gap-4"
                                >
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex items-center gap-2.5">
                                            <span className="font-bold text-slate-800 truncate text-base">
                                                {webhook.space_name}
                                            </span>
                                            {webhook.active ? (
                                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 border flex items-center gap-1 py-0 px-2 text-[10px]">
                                                    <CheckCircle2 className="h-3 w-3" /> 有効
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-slate-200 border flex items-center gap-1 py-0 px-2 text-[10px]">
                                                    <XCircle className="h-3 w-3" /> 無効
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs font-mono text-slate-400 truncate bg-slate-50/50 p-2 rounded-lg border border-slate-100/50 max-w-3xl">
                                            {webhook.webhook_url}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditClick(webhook)}
                                            className="gap-1 border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-200 transition-colors"
                                        >
                                            <Settings2 className="h-3.5 w-3.5" /> 編集
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteClick(webhook.id, webhook.space_name)}
                                            className="gap-1 border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50/50 hover:border-red-200 transition-colors"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" /> 削除
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* フォームダイアログ */}
            <WebhookFormDialog
                webhook={selectedWebhook}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSuccess={fetchWebhooks}
            />
        </div>
    )
}
