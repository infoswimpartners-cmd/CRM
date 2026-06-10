'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createAnnouncementAction } from "@/actions/announcement";
import { getChatWebhooksAction, ChatWebhook } from "@/actions/gchat_webhook";
import { toast } from "sonner";
import { Loader2, BellRing, MessageSquare } from "lucide-react";

export default function CreateAnnouncementPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    
    // 通知設定用の state
    const [notifyGChat, setNotifyGChat] = useState(false)
    const [webhooks, setWebhooks] = useState<ChatWebhook[]>([])
    const [selectedWebhookId, setSelectedWebhookId] = useState<string>('')

    // 有効なWebhook一覧を取得
    useEffect(() => {
        const fetchWebhooks = async () => {
            const res = await getChatWebhooksAction()
            if (res.success) {
                // 有効なもののみフィルタリング
                const activeWebhooks = res.data.filter(w => w.active)
                setWebhooks(activeWebhooks)
                if (activeWebhooks.length > 0) {
                    setSelectedWebhookId(activeWebhooks[0].id)
                }
            }
        };
        fetchWebhooks()
    }, [])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (notifyGChat && !selectedWebhookId) {
            toast.error('Google Chatの通知先スペースを選択してください')
            return
        }

        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const title = formData.get('title') as string;
        const content = formData.get('content') as string;
        const priority = formData.get('priority') as 'normal' | 'high';

        try {
            const result = await createAnnouncementAction({
                title,
                content,
                priority,
                notifyGChat,
                gchatWebhookId: notifyGChat ? selectedWebhookId : null
            });

            if (result.success) {
                toast.success('お知らせを作成しました', {
                    description: notifyGChat ? '各種通知の配信処理を開始しました。' : undefined
                });

                router.push('/admin/announcements');
                router.refresh();
            } else {
                toast.error('エラーが発生しました', {
                    description: result.error
                });
            }
        } catch (error) {
            console.error(error);
            toast.error('予期せぬエラーが発生しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">お知らせ作成</h1>

            <Card className="border-slate-100 shadow-xl overflow-hidden rounded-2xl bg-white/70 backdrop-blur-md">
                <CardHeader className="bg-slate-50/50 pb-5">
                    <CardTitle className="text-lg font-bold text-slate-800">新規お知らせ</CardTitle>
                    <CardDescription>
                        作成されたお知らせは、生徒およびコーチのダッシュボードに掲示されます。
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="font-semibold text-slate-700">タイトル</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="例：システムメンテナンスのお知らせ"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="priority" className="font-semibold text-slate-700">優先度</Label>
                            <Select name="priority" defaultValue="normal">
                                <SelectTrigger className="border-slate-200 bg-white">
                                    <SelectValue placeholder="優先度を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="normal">通常</SelectItem>
                                    <SelectItem value="high">重要（赤字表示）</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content" className="font-semibold text-slate-700">本文</Label>
                            <Textarea
                                id="content"
                                name="content"
                                placeholder="お知らせの内容を入力してください..."
                                className="min-h-[200px] border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
                                required
                            />
                        </div>

                        {/* 通知配信設定カード */}
                        <div className="space-y-4 border rounded-xl p-4 bg-slate-50/50 border-slate-100">
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100/80">
                                <BellRing className="h-4 w-4 text-indigo-600 animate-pulse" />
                                <Label className="font-bold text-slate-800">通知配信設定</Label>
                            </div>
                            {/* Google Chat通知設定 */}
                            <div className="flex items-start space-x-3 space-y-0">
                                <Checkbox
                                    id="notify-gchat"
                                    checked={notifyGChat}
                                    onCheckedChange={(checked) => setNotifyGChat(checked as boolean)}
                                    className="border-slate-300"
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label
                                        htmlFor="notify-gchat"
                                        className="text-sm font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5"
                                    >
                                        <MessageSquare className="h-4 w-4 text-slate-400" />
                                        Google Chatに通知する
                                    </label>
                                    <p className="text-xs text-slate-400">
                                        指定したGoogle Chatのスペース（Webhook）にお知らせ内容を自動転送します。
                                    </p>
                                </div>
                            </div>

                            {/* Webhookスペース選択 (Google Chatがチェックされている場合のみ表示) */}
                            {notifyGChat && (
                                <div className="space-y-2 pl-7 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <Label htmlFor="webhook-select" className="text-xs font-semibold text-slate-600">通知先Google Chatスペース</Label>
                                    {webhooks.length === 0 ? (
                                        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded-lg flex flex-col gap-1">
                                            <span className="font-bold">※ 有効なGoogle Chatスペースが登録されていません。</span>
                                            <span>先に「Google Chat連携設定」からWebhookを登録してください。</span>
                                        </div>
                                    ) : (
                                        <Select value={selectedWebhookId} onValueChange={setSelectedWebhookId}>
                                            <SelectTrigger id="webhook-select" className="bg-white border-slate-200 shadow-sm max-w-md">
                                                <SelectValue placeholder="通知先のスペースを選択" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {webhooks.map((webhook) => (
                                                    <SelectItem key={webhook.id} value={webhook.id}>
                                                        {webhook.space_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-4 border-t pt-5 border-slate-100">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={isLoading}
                                className="border-slate-200 text-slate-700"
                            >
                                キャンセル
                            </Button>
                            <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                作成・配信
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
