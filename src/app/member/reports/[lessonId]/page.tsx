import { createClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, User, Clock, Play, Image as ImageIcon, MessageSquare, Star, Target } from 'lucide-react';
import { LessonMediaGallery } from './_components/LessonMediaGallery';

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
        return <div>レポートが見つかりません</div>;
    }

    // メディア情報を取得
    const { data: mediaItems } = await client
        .from('lesson_media')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('display_order', { ascending: true });

    const date = new Date(lesson.lesson_date);

    return (
        <div className="space-y-5 pb-24">
            {/* ヘッダー */}
            <div className="flex items-center gap-3">
                <Link href="/member/reports" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft size={20} className="text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">
                        {date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })} のレポート
                    </h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {date.getFullYear()}年 · {lesson.profiles?.full_name || '担当コーチ'}
                    </p>
                </div>
            </div>

            {/* 基本情報カード */}
            <div className="glass-card p-5 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-800">
                        {date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-cyan-600" />
                    </div>
                    <span className="text-gray-700">{lesson.location || '場所未定'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="text-gray-700">{lesson.profiles?.full_name || '担当コーチ'}</span>
                </div>
            </div>

            {/* 動画・写真セクション */}
            {mediaItems && mediaItems.length > 0 ? (
                <section className="space-y-3">
                    <h2 className="text-sm font-black text-gray-700 flex items-center gap-2 px-1">
                        <Play className="w-4 h-4 text-blue-500" />
                        レッスン動画・写真
                        <span className="text-xs font-normal text-gray-400">({mediaItems.length}件)</span>
                    </h2>
                    <LessonMediaGallery mediaItems={mediaItems} />
                </section>
            ) : (
                <div className="glass-card p-6 text-center bg-gradient-to-br from-gray-50/50 to-white/50">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <ImageIcon className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-400">まだ動画・写真はありません</p>
                    <p className="text-xs text-gray-300 mt-1">コーチがアップロードするとここに表示されます</p>
                </div>
            )}

            {/* フィードバックセクション */}
            <section className="space-y-4">
                <h2 className="text-sm font-black text-gray-700 flex items-center gap-2 px-1">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    コーチからのフィードバック
                </h2>

                {/* 今回のメニュー */}
                {lesson.menu_description && (
                    <div className="glass-card overflow-hidden">
                        <div className="px-5 py-3 bg-blue-500 text-white">
                            <h3 className="text-sm font-black">今回のメニュー</h3>
                        </div>
                        <div className="p-5">
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                {lesson.menu_description}
                            </p>
                        </div>
                    </div>
                )}

                {/* コーチコメント */}
                {lesson.coach_comment && (
                    <div className="glass-card overflow-hidden">
                        <div className="px-5 py-3 bg-indigo-500 text-white">
                            <h3 className="text-sm font-black">コーチからのコメント</h3>
                        </div>
                        <div className="p-5">
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                {lesson.coach_comment}
                            </p>
                        </div>
                    </div>
                )}

                {/* 良かった点 */}
                {lesson.feedback_good && (
                    <div className="glass-card overflow-hidden">
                        <div className="px-5 py-3 bg-green-500 text-white flex items-center gap-2">
                            <Star className="w-4 h-4 fill-current" />
                            <h3 className="text-sm font-black">良かった点</h3>
                        </div>
                        <div className="p-5">
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                {lesson.feedback_good}
                            </p>
                        </div>
                    </div>
                )}

                {/* 次回の課題 */}
                {lesson.feedback_next && (
                    <div className="glass-card overflow-hidden">
                        <div className="px-5 py-3 bg-orange-500 text-white flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            <h3 className="text-sm font-black">次回の課題</h3>
                        </div>
                        <div className="p-5">
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                {lesson.feedback_next}
                            </p>
                        </div>
                    </div>
                )}

                {/* フィードバックがない場合 */}
                {!lesson.menu_description && !lesson.coach_comment && !lesson.feedback_good && !lesson.feedback_next && (
                    <div className="glass-card p-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                            <MessageSquare className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400">まだフィードバックはありません</p>
                    </div>
                )}
            </section>
        </div>
    );
}
