import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { redirect } from 'next/navigation';

export default async function MemberLessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/member/login');
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">レッスン記録</h1>
                <Badge variant="outline">2026/02/10 実施</Badge>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>練習メニュー</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="whitespace-pre-wrap">
                        ・蹴伸び 5m x 4
                        ・板キック 25m x 4
                        ・クロール（呼吸なし） 12.5m x 4
                        ・クロール（呼吸あり） 25m x 2
                    </p>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                        <CardTitle className="text-green-800">Good Point!</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-green-900">
                            蹴伸びの姿勢がとてもきれいになりました！
                            頭をしっかり入れる意識ができています。
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader>
                        <CardTitle className="text-orange-800">Next Challenge</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-orange-900">
                            息継ぎのときに顔を上げすぎないように注意しましょう。
                            水面ギリギリで吸えるようになるともっと進みます！
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
