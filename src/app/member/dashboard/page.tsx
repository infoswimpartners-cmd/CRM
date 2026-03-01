import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import TicketCard from '@/components/member/TicketCard';
import NextLessonCard from '@/components/member/NextLessonCard';
import LastReportCard from '@/components/member/LastReportCard';
import LessonHistoryWidget from '@/components/member/LessonHistoryWidget';
import MemberAnnouncementsCard from '@/components/member/MemberAnnouncementsCard';
import MemberQuickActions from '@/components/member/MemberQuickActions';
import { linkStudentData, syncLineId, memberSignOut } from '@/actions/member/auth';
import { MessageCircle, BellRing, Settings } from 'lucide-react';
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
    let unreadCount = 0;
    let notifications: any[] = [];
    let membershipType = initialStudent?.membership_types || null;

    const supabase = await createClient();

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

        const [nextLessonRes, pastLessonsRes, notificationsRes] = await Promise.all([
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
                .limit(5)
        ]);

        nextLesson = nextLessonRes.data;
        historyLessons = pastLessonsRes.data || [];
        lastReport = historyLessons.length > 0 ? historyLessons[0] : null;
        notifications = notificationsRes.data || [];
        unreadCount = notifications.length;
        membershipType = student.membership_types;
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
        <div className="space-y-6 pb-24">

            {/* NextAuthログインセッションの一掃用（連携直後、またはURLアクションがあるが連携不要な場合にもセッションは不要なのでクリア） */}
            {isLinkingLine && <ClearNextAuthSession />}
            {/* LINE連携案内プロンプト (未連携時のみ) */}
            {!student.line_user_id && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-[2rem] text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center space-x-2">
                            <MessageCircle className="h-6 w-6" />
                            <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80">LINE通知連携</span>
                        </div>
                        <h2 className="text-lg font-black leading-snug">
                            前日のリマインド通知を<br />LINEで受け取りませんか？
                        </h2>
                        <p className="text-[10px] font-bold opacity-80">
                            連携すると欠席連絡や振替通知、カルテの更新も<br />LINEでスマートに届きます。
                        </p>
                        <LineLinkButton />
                    </div>
                    {/* 装飾 */}
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -left-4 -top-4 w-24 h-24 bg-emerald-400/20 rounded-full blur-2xl" />
                </div>
            )}

            {/* 次回レッスン */}
            <NextLessonCard lesson={nextLesson} />

            {/* クイックアクション */}
            <MemberQuickActions />

            {/* お知らせ */}
            {notifications.length > 0 && (
                <MemberAnnouncementsCard notifications={notifications} />
            )}

            {/* 最新のフィードバック & レッスン履歴 */}
            <div className="space-y-6">
                <LastReportCard report={lastReport} />
                <LessonHistoryWidget lessons={historyLessons.slice(1, 4)} />
            </div>

            {/* チケット */}
            <div className="grid grid-cols-1 gap-4">
                <TicketCard balance={student.current_tickets || 0} />
            </div>

            <div className="pt-4 text-center">
                <form action="/api/auth/signout" method="POST">
                    <button type="submit" className="text-xs font-bold text-gray-300 hover:text-gray-500 transition-colors uppercase tracking-[0.2em]">
                        ログアウト
                    </button>
                </form>
            </div>
        </div>
    );
}
