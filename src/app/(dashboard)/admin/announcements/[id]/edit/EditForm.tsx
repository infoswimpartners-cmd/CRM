'use client'

import { useState } from "react";
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
import { updateAnnouncementAction } from "@/actions/announcement";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditAnnouncementFormProps {
    announcement: {
        id: string
        title: string
        content: string
        priority: 'normal' | 'high'
    }
}

export default function EditAnnouncementForm({ announcement }: EditAnnouncementFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [priority, setPriority] = useState<'normal' | 'high'>(announcement.priority);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const title = formData.get('title') as string;
        const content = formData.get('content') as string;

        try {
            const result = await updateAnnouncementAction({
                id: announcement.id,
                title,
                content,
                priority,
            });

            if (result.success) {
                toast.success('お知らせを更新しました');
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
            <h1 className="text-2xl font-bold tracking-tight">お知らせ編集</h1>

            <Card className="border-slate-100 shadow-xl overflow-hidden rounded-2xl bg-white/70 backdrop-blur-md">
                <CardHeader className="bg-slate-50/50 pb-5">
                    <CardTitle className="text-lg font-bold text-slate-800">お知らせの編集</CardTitle>
                    <CardDescription>
                        お知らせの内容を更新します。
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="font-semibold text-slate-700">タイトル</Label>
                            <Input
                                id="title"
                                name="title"
                                defaultValue={announcement.title}
                                placeholder="例：システムメンテナンスのお知らせ"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="priority" className="font-semibold text-slate-700">優先度</Label>
                            <Select name="priority" value={priority} onValueChange={(val: 'normal' | 'high') => setPriority(val)}>
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
                                defaultValue={announcement.content}
                                placeholder="お知らせの内容を入力してください..."
                                className="min-h-[200px] border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
                                required
                            />
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
                                更新する
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
