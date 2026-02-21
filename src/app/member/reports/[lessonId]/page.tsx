import { createClient } from '@/lib/supabase/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, User, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default async function ReportDetailPage({ params }: { params: { lessonId: string } }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const session = await getServerSession(authOptions);

    if (!user && !session) {
        redirect('/member/login');
    }

    const client = user ? supabase : createAdminClient();
    const lessonId = params.lessonId;

    const { data: lesson, error } = await client
        .from('lessons')
        .select(`
            *,
            profiles ( full_name, avatar_url )
        `)
        .eq('id', lessonId)
        .single();

    if (error || !lesson) {
        return <div>Report not found</div>;
    }

    const date = new Date(lesson.lesson_date);

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-2">
                <Link href="/member/reports" className="text-gray-500">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-xl font-bold">
                    {date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                </h1>
            </div>

            {/* Basic Info */}
            <Card>
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span className="font-medium">
                            {date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} ~
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <span>{lesson.location || '場所未定'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-gray-400" />
                        <span>担当: {lesson.profiles?.full_name}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Content */}
            <div className="space-y-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="py-3 px-4 bg-blue-50/50">
                        <CardTitle className="text-sm font-bold text-blue-700">今回のメニュー</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-3">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                            {lesson.menu_description || '記録なし'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="py-3 px-4 bg-green-50/50">
                        <CardTitle className="text-sm font-bold text-green-700">良かった点</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-3">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                            {lesson.feedback_good || '記録なし'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="py-3 px-4 bg-orange-50/50">
                        <CardTitle className="text-sm font-bold text-orange-700">次回の課題</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-3">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                            {lesson.feedback_next || '記録なし'}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
