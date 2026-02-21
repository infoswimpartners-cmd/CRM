import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import TicketCard from '@/components/member/TicketCard';
import NextLessonCard from '@/components/member/NextLessonCard';
import LastReportCard from '@/components/member/LastReportCard';
import { Bell } from 'lucide-react';

export default async function MemberDashboard() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const session = await getServerSession(authOptions);

    if (!user && !session) {
        redirect('/member/login');
    }

    let student = null;
    let nextLesson = null;
    let lastReport = null;
    let unreadCount = 0;

    // Helper to get student and data
    const fetchStudentData = async (queryUser: boolean, userId: string) => {
        const client = queryUser ? supabase : createAdminClient();
        const field = queryUser ? 'auth_user_id' : 'line_user_id';

        const { data: studentData, error } = await client
            .from('students')
            .select('*')
            .eq(field, userId)
            .single();

        if (error || !studentData) return null;

        // Fetch Next Lesson
        const { data: lessonData } = await client
            .from('lessons')
            .select('*, profiles:coach_id(full_name)')
            .eq('student_id', studentData.id)
            .gte('lesson_date', new Date().toISOString())
            .order('lesson_date', { ascending: true })
            .limit(1)
            .single();

        // Fetch Last Report (Past Lesson)
        const { data: reportData } = await client
            .from('lessons')
            .select('*, profiles:coach_id(full_name)')
            .eq('student_id', studentData.id)
            .lt('lesson_date', new Date().toISOString()) // Only past lessons
            .order('lesson_date', { ascending: false })
            .limit(1)
            .single();

        // Fetch Unread Notifications
        let count = 0;
        try {
            const { count: notifCount, error: notifError } = await client
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('student_id', studentData.id)
                .eq('is_read', false);
            if (!notifError) count = notifCount || 0;
        } catch (e) {
            console.error('Failed to fetch notifications:', e);
        }

        return { student: studentData, nextLesson: lessonData, lastReport: reportData, unreadCount: count };
    };

    if (user) {
        const result = await fetchStudentData(true, user.id);
        if (result) {
            student = result.student;
            nextLesson = result.nextLesson;
            lastReport = result.lastReport;
            unreadCount = result.unreadCount;
        }
    } else if (session?.user) {
        const lineUserId = (session.user as any).id;
        const result = await fetchStudentData(false, lineUserId);
        if (result) {
            student = result.student;
            nextLesson = result.nextLesson;
            lastReport = result.lastReport;
            unreadCount = result.unreadCount;
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
        <div className="space-y-6 pb-20">
            {/* Main Content Grid */}
            <div className="space-y-6">
                <section>
                    <NextLessonCard lesson={nextLesson} />
                </section>

                <section>
                    <LastReportCard report={lastReport} />
                </section>

                <section>
                    <TicketCard balance={student.current_tickets || 0} />
                </section>

            </div>
        </div>
    );
}
