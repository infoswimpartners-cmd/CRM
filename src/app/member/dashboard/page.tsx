import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import NextLessonCard from '@/components/member/NextLessonCard';
import LastReportCard from '@/components/member/LastReportCard';
import LessonHistoryWidget from '@/components/member/LessonHistoryWidget';
import MemberAnnouncementsCard from '@/components/member/MemberAnnouncementsCard';
import TrioDashboardSection from '@/components/member/TrioDashboardSection';
import { StudentScheduleSection } from '@/components/customers/StudentScheduleSection';
import { linkStudentData, syncLineId, memberSignOut } from '@/actions/member/auth';
import { MessageCircle, BellRing, Calendar, Crown, Sparkles, ArrowRight, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import LineLinkButton from '@/components/member/LineLinkButton';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import ClearNextAuthSession from '@/components/member/ClearNextAuthSession';

import { getCachedMemberData } from '@/lib/member-data';

export default async function MemberDashboard({
    searchParams
}: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const sp = await searchParams;
    const isLinkingLine = sp?.action === 'link_line';

    const { user, student: initialStudent } = await getCachedMemberData();

    if (!user) {
        redirect('/member/login');
    }

    let student = initialStudent;
    let nextLesson = null;
    let lastReport = null;
    let historyLessons: any[] = [];
    let schedules: any[] = [];
    let unreadCount = 0;
    let notifications: any[] = [];
    let trioEntries: any[] = [];
    let membershipType = initialStudent?.membership_types || null;

    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    // 1. 生徒データがまだない場合は自動リンクを試行
    if (!student) {
        const linkResult = await linkStudentData();
        if (linkResult.success) {
            // 再取得
            const { student: refreshedStudent } = await getCachedMemberData();
            student = refreshedStudent;
        }
    }

    // 2. LINE連携同期（SupabaseのIdentity連携用）
    if (student && !student.line_user_id) {
        const syncResult = await syncLineId();
        if (syncResult.success) {
            const { student: refreshedStudent } = await getCachedMemberData();
            student = refreshedStudent;
        }
    }

    // 3. NextAuth経由でのLINEアカウント連携
    // LINEと連携するボタンからNextAuthログインが行われた場合、ここにセッションが入ります
    let lineLinkedJustNow = false;

    // 今回が連携アクションの場合のみ、NextAuthのセッションからIDを取得する
    if (isLinkingLine && student && !student.line_user_id) {
        const nextAuthSession = await getServerSession(authOptions);
        if (nextAuthSession?.user) {
            const lineUserId = (nextAuthSession.user as any).id;
            if (lineUserId) {
                const { error: updateError } = await supabase
                    .from('students')
                    .update({ line_user_id: lineUserId })
                    .eq('id', student.id);

                if (!updateError) {
                    student.line_user_id = lineUserId;
                    lineLinkedJustNow = true;
                }
            }
        }
    }

    // 3. メインデータの並列取得（高速化の肝）
    if (student) {
        const now = new Date().toISOString();

        const [nextLessonRes, pastLessonsRes, notificationsRes, schedulesRes, trioEntriesRes] = await Promise.all([
            // 次回のレッスン
            supabase
                .from('lessons')
                .select('*, profiles:coach_id(full_name)')
                .eq('student_id', student.id)
                .neq('status', 'cancelled')
                .gte('lesson_date', now)
                .order('lesson_date', { ascending: true })
                .limit(1)
                .single(),

            // 過去のレッスン（最新のフィードバックと履歴用）
            supabase
                .from('lessons')
                .select('*, profiles:coach_id(full_name)')
                .eq('student_id', student.id)
                .lt('lesson_date', now)
                .order('lesson_date', { ascending: false })
                .limit(4),

            // 未読通知
            supabase
                .from('notifications')
                .select('*')
                .eq('student_id', student.id)
                .eq('is_read', false)
                .order('created_at', { ascending: false })
                .limit(5),

            // 登録された予定 (lesson_schedules)
            supabaseAdmin
                .from('lesson_schedules')
                .select(`
                    id,
                    title,
                    start_time,
                    end_time,
                    location,
                    status:billing_status,
                    notes,
                    student_id,
                    coach_id,
                    profiles (
                        full_name
                    )
                `)
                .eq('student_id', student.id)
                .order('start_time', { ascending: false })
                .limit(50),

            // Trioの予約状況
            supabaseAdmin
                .from('trio_entries')
                .select(`
                    id,
                    payment_status,
                    slot:trio_slots (
                        id,
                        start_at,
                        end_at,
                        status
                    )
                `)
                .eq('student_id', student.id)
                .order('id', { ascending: false })
        ]);
        
        nextLesson = nextLessonRes.data;
        historyLessons = pastLessonsRes.data || [];
        lastReport = historyLessons.length > 0 ? historyLessons[0] : null;
        notifications = notificationsRes.data || [];
        schedules = schedulesRes?.data || [];
        unreadCount = notifications.length;
        trioEntries = trioEntriesRes?.data || [];
    }

    if (!student) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 max-w-md w-full">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Settings className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-800 mb-4">アカウント設定中</h1>
                    <p className="text-sm text-gray-600 leading-relaxed mb-6">
                        会員データの紐付けが完了していません。<br />
                        お手数ですが管理画面で登録されているメールアドレスと、ログインしたメールアドレス（{user.email}）が一致しているかご確認ください。
                    </p>
                    <form action={memberSignOut} className="w-full">
                        <Button type="submit" className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl h-14 font-bold">
                            ログイン画面に戻る
                        </Button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-32 animate-fade-in-up">
            {/* NextAuthログインセッションの一掃用 */}
            {isLinkingLine && <ClearNextAuthSession />}
            
            {/* 挨拶とクイックアクセス */}
            <div className="flex items-center justify-between px-2 pt-4">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-50 border border-sky-100 rounded-full">
                        <Sparkles className="w-3 h-3 text-sky-500 animate-pulse" />
                        <span className="text-[10px] text-sky-600 font-black uppercase tracking-[0.2em]">Member Dashboard</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none pt-2">
                        {student.full_name} <span className="text-slate-400 font-medium">様</span>
                    </h2>
                </div>
            </div>

            {/* Trio 予約状況 (最優先) */}
            <TrioDashboardSection entries={trioEntries} />

            {/* 次回レッスン (個人) */}
            <div className="space-y-8">
                <div className="flex items-center gap-6 px-2">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-sky-100 shadow-[0_8px_30px_rgba(56,189,248,0.06)] flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-sky-500" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tighter">個人レッスン</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Personal Training</p>
                    </div>
                </div>
                <NextLessonCard 
                    lesson={nextLesson} 
                    isMember={!!student.membership_type_id} 
                />
            </div>

            {/* お知らせ・レポートの並列グリッド */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* お知らせ */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                        <BellRing className="w-5 h-5 text-amber-500" />
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">重要なお知らせ</h3>
                    </div>
                    <MemberAnnouncementsCard notifications={notifications} />
                </div>

                {/* 最新のフィードバック */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                        <MessageCircle className="w-5 h-5 text-indigo-500" />
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">前回のフィードバック</h3>
                    </div>
                    <LastReportCard report={lastReport} />
                </div>
            </div>

            {/* 登録された予定一覧 */}
            <div className="space-y-8">
                <div className="flex items-center gap-6 px-2">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex items-center justify-center">
                        <div className="w-2 h-6 bg-slate-800 rounded-full" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tighter">全スケジュール履歴</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Full History</p>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-3xl border border-slate-100 rounded-[3rem] p-10 shadow-[0_30px_100px_rgba(0,0,0,0.03)]">
                    <StudentScheduleSection schedules={
                        schedules.map((s: any) => ({
                            ...s,
                            coach_full_name: Array.isArray(s.profiles) ? s.profiles[0]?.full_name : s.profiles?.full_name,
                        }))
                    } />
                </div>
            </div>

            {/* フッターアクション */}
            <div className="pt-24 pb-12 text-center flex flex-col items-center gap-10">
                <div className="h-px w-24 bg-gradient-to-r from-transparent via-slate-100 to-transparent" />
                <form action="/api/auth/signout" method="POST">
                    <button type="submit" className="group flex items-center gap-4 px-10 py-4 rounded-full bg-white border border-slate-100 text-[11px] font-black text-slate-400 hover:text-slate-900 hover:border-sky-100 hover:shadow-[0_20px_50px_rgba(56,189,248,0.1)] transition-all uppercase tracking-[0.4em] active:scale-95 shadow-sm">
                        <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        ログアウト
                    </button>
                </form>
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">Swim Partners Portal v2.0</p>
            </div>
        </div>
    );
}
