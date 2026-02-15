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
import { createAnnouncementAction } from "@/actions/announcement";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function CreateAnnouncementPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const title = formData.get('title') as string;
        const content = formData.get('content') as string;
        const priority = formData.get('priority') as 'normal' | 'high';

        try {
            const result = await createAnnouncementAction({
                title,
                content,
                priority
            });

            if (result.success) {
                toast.success('お知らせを作成しました', {
                    description: '配信メールの送信処理を開始しました。'
                });

                // Using replace to prevent back navigation loop, but push is fine usually.
                // Adding a small delay to ensure toast is seen if needed, but router.push should verify immediately.
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
            // Only set loading to false if we are NOT redirecting successfully
            // Actually better to keep it true if redirecting to prevent double submit
            // But if there is an error, we must set it to false.
            // Since we lack 'result.success' in this scope easily without refactor, 
            // I'll check inside the try block or just set it false here.
            // For UX, if redirecting, the page unmounts. If not, we need to re-enable.
            // I will set it false here.
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold tracking-tight mb-6">お知らせ作成</h1>

            <Card>
                <CardHeader>
                    <CardTitle>新規お知らせ</CardTitle>
                    <CardDescription>
                        入力した内容は全コーチにメールで通知されます。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">タイトル</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="例：システムメンテナンスのお知らせ"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="priority">優先度</Label>
                            <Select name="priority" defaultValue="normal">
                                <SelectTrigger>
                                    <SelectValue placeholder="優先度を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="normal">通常</SelectItem>
                                    <SelectItem value="high">重要（赤字表示）</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">本文</Label>
                            <Textarea
                                id="content"
                                name="content"
                                placeholder="お知らせの内容を入力してください..."
                                className="min-h-[200px]"
                                required
                            />
                        </div>

                        <div className="flex justify-end gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={isLoading}
                            >
                                キャンセル
                            </Button>
                            <Button type="submit" disabled={isLoading}>
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
