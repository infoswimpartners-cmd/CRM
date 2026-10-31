import { createClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, User, Clock, Play, MessageSquare } from 'lucide-react';
import { LessonMediaGallery } from './_components/LessonMediaGallery';

export default async function ReportDetailPage({ params }: { params: Promise<{ lessonId: string }> }) {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    const session = await getServerSession(authOptions);

    if (!user && !session) {
        redirect('/member/login');
    }

    const { lessonId } = await params;
    const client = user ? supabase : createAdminClient();

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
        <div className="space-y-6 pb-24">
            {/* ヘッダー */}
            <div className="flex items-center gap-3">
                <Link href="/member/dashboard" className="p-2.5 rounded-2xl bg-white border border-sky-100 hover:bg-sky-50 text-slate-600 hover:text-sky-600 transition-colors shadow-sm">
                    <ArrowLeft size={18} />
                </Link>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                        {date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })} のレポート
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {date.getFullYear()}年 · {lesson.profiles?.full_name || '担当コーチ'}
                    </p>
                </div>
            </div>

            {/* 基本情報カード */}
            <div className="glass-card p-5 space-y-3.5 border-sky-100/60 bg-white/80 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center shrink-0 border border-sky-100">
                        <Clock className="w-4 h-4 text-sky-600" />
                    </div>
                    <span className="font-medium text-slate-800">
                        {date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0 border border-cyan-100">
                        <MapPin className="w-4 h-4 text-cyan-600" />
                    </div>
                    <span className="text-slate-700">{lesson.location || '場所未定'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                        <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-slate-700">{lesson.profiles?.full_name || '担当コーチ'}</span>
                </div>
            </div>

            {/* 動画・写真セクション（メディアがある場合のみ表示） */}
            {mediaItems && mediaItems.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                        <Play className="w-4 h-4 text-sky-500" />
                        レッスン動画・写真
                        <span className="text-xs font-normal text-slate-400">({mediaItems.length}件)</span>
                    </h2>
                    <LessonMediaGallery mediaItems={mediaItems} />
                </section>
            )}

            {/* フィードバックセクション（1つのカードに統合） */}
            <section className="space-y-4">
                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                    <MessageSquare className="w-4 h-4 text-sky-500" />
                    コーチからのフィードバック
                </h2>

                {(lesson.coach_comment || lesson.menu_description || lesson.feedback_good || lesson.feedback_next) ? (
                    <div className="glass-card overflow-hidden bg-white/90 border-sky-100 rounded-3xl shadow-sm">
                        <div className="px-6 py-4 bg-gradient-to-r from-sky-600 to-blue-600 text-white flex items-center justify-between shadow-sm">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                レッスンレポート
                            </h3>
                            {lesson.profiles?.full_name && (
                                <span className="text-xs font-semibold text-white bg-white/20 px-3 py-1 rounded-full">
                                    {lesson.profiles.full_name} コーチ
                                </span>
                            )}
                        </div>
                        <div className="p-6 md:p-8 space-y-6">
                            {/* メインのコメント・フィードバック */}
                            <div className="whitespace-pre-wrap text-sm md:text-base leading-relaxed text-slate-800 font-medium">
                                {lesson.coach_comment || lesson.menu_description}
                            </div>

                            {/* もしcoach_commentとmenu_descriptionの両方が別々に入力されている場合 */}
                            {lesson.coach_comment && lesson.menu_description && lesson.coach_comment !== lesson.menu_description && (
                                <div className="pt-4 border-t border-slate-100">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">実施メニュー</h4>
                                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 bg-sky-50/40 p-4 rounded-2xl border border-sky-100/60">
                                        {lesson.menu_description}
                                    </div>
                                </div>
                            )}

                            {/* 過去データの個別項目がある場合もここに集約 */}
                            {lesson.feedback_good && (
                                <div className="pt-4 border-t border-slate-100">
                                    <h4 className="text-xs font-bold text-emerald-600 mb-1">【良かった点・成長したポイント】</h4>
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                                        {lesson.feedback_good}
                                    </p>
                                </div>
                            )}
                            {lesson.feedback_next && (
                                <div className="pt-4 border-t border-slate-100">
                                    <h4 className="text-xs font-bold text-amber-600 mb-1">【次回へのアドバイス・目標】</h4>
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                                        {lesson.feedback_next}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="glass-card p-8 text-center bg-white/80 border-sky-100 rounded-3xl shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-3 text-sky-400">
                            <MessageSquare className="w-5 h-5 opacity-60" />
                        </div>
                        <p className="text-sm text-slate-400">まだフィードバックはありません</p>
                    </div>
                )}
            </section>
        </div>
    );
}
