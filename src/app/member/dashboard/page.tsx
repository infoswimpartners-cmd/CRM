import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { createAdminClient } from '@/lib/supabase/admin';
import TicketCard from '@/components/member/TicketCard';
import NextLessonCard from '@/components/member/NextLessonCard';
import LastReportCard from '@/components/member/LastReportCard';
import MemberPlanCard from '@/components/member/MemberPlanCard';
import MemberAnnouncementsCard from '@/components/member/MemberAnnouncementsCard';
import MemberQuickActions from '@/components/member/MemberQuickActions';

export default async function MemberDashboard() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const session = await getServerSession(authOptions);

    if (!user && !session) {
        redirect('/member/login');
    }

    let student: any = null;
    let nextLesson = null;
    let lastReport = null;
    let unreadCount = 0;
    let notifications: any[] = [];
    let membershipType: any = null;

    // 生徒情報・レッスン情報を取得するヘルパー
    const fetchStudentData = async (queryUser: boolean, userId: string) => {
        const client = queryUser ? supabase : createAdminClient();
        const field = queryUser ? 'auth_user_id' : 'line_user_id';

        const { data: studentData, error } = await client
            .from('students')
            .select('*, membership_types(id, name, lesson_count_per_month, unit_price)')
            .eq(field, userId)
            .single();

        if (error || !studentData) return null;

        // 次回のレッスン
        const { data: lessonData } = await client
            .from('lessons')
            .select('*, profiles:coach_id(full_name)')
            .eq('student_id', studentData.id)
            .neq('status', 'cancelled')
            .gte('lesson_date', new Date().toISOString())
            .order('lesson_date', { ascending: true })
            .limit(1)
            .single();

        // 前回のレポート（過去レッスン）
        const { data: reportData } = await client
            .from('lessons')
            .select('*, profiles:coach_id(full_name)')
            .eq('student_id', studentData.id)
            .lt('lesson_date', new Date().toISOString())
            .order('lesson_date', { ascending: false })
            .limit(1)
            .single();

        // 未読通知
        let count = 0;
        let notifs: any[] = [];
        try {
            const { data: notifData, error: notifError } = await client
                .from('notifications')
                .select('*')
                .eq('student_id', studentData.id)
                .eq('is_read', false)
                .order('created_at', { ascending: false })
                .limit(5);
            if (!notifError && notifData) {
                notifs = notifData;
                count = notifData.length;
            }
        } catch (e) {
            console.error('Failed to fetch notifications:', e);
        }

        return {
            student: studentData,
            nextLesson: lessonData,
            lastReport: reportData,
            unreadCount: count,
            notifications: notifs,
            membershipType: studentData.membership_types || null,
        };
    };

    if (user) {
        const result = await fetchStudentData(true, user.id);
        if (result) {
            student = result.student;
            nextLesson = result.nextLesson;
            lastReport = result.lastReport;
            unreadCount = result.unreadCount;
            notifications = result.notifications;
            membershipType = result.membershipType;
        }
    } else if (session?.user) {
        const lineUserId = (session.user as any).id;
        const result = await fetchStudentData(false, lineUserId);
        if (result) {
            student = result.student;
            nextLesson = result.nextLesson;
            lastReport = result.lastReport;
            unreadCount = result.unreadCount;
            notifications = result.notifications;
            membershipType = result.membershipType;
        }
    }

    if (!student) {
        return (
            <div className="p-4 space-y-4">
                <h1 className="text-2xl font-bold text-red-600">エラー</h1>
                <p>会員データが見つかりません。まだアカウントが連携されていない可能性があります。</p>
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-24">
            {/* ウェルカムメッセージ */}
            <div className="px-1">
                <h1 className="text-xl font-black text-gray-800">
                    こんにちは、<span className="text-blue-600">{student.full_name?.split(' ')[0] || '会員'}</span> さん 👋
                </h1>
                <p className="text-xs text-gray-500 mt-1">今日もレッスンを振り返りましょう</p>
            </div>

            {/* クイックアクション（3つの目的に素早くアクセス） */}
            <MemberQuickActions />

            {/* お知らせ */}
            {notifications.length > 0 && (
                <MemberAnnouncementsCard notifications={notifications} />
            )}

            {/* 次回レッスン */}
            <section>
                <NextLessonCard lesson={nextLesson} />
            </section>

            {/* 前回のレポート */}
            <section>
                <LastReportCard report={lastReport} />
            </section>

            {/* プラン情報 + チケット */}
            <div className="grid grid-cols-1 gap-4">
                <section>
                    <MemberPlanCard
                        student={student}
                        membershipType={membershipType}
                    />
                </section>

                <section>
                    <TicketCard balance={student.current_tickets || 0} />
                </section>
            </div>
        </div>
    );
}
