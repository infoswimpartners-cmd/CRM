import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, XCircle, CalendarX } from 'lucide-react';
import { CancelUpcomingLessons } from './_components/CancelUpcomingLessons';

export default async function CancelPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const session = await getServerSession(authOptions);

    if (!user && !session) {
        redirect('/member/login');
    }

    const client = user ? supabase : createAdminClient();
    const field = user ? 'auth_user_id' : 'line_user_id';
    const userId = user ? user.id : (session?.user as any)?.id;

    // 生徒情報を取得
    const { data: student } = await client
        .from('students')
        .select('id, full_name, current_tickets')
        .eq(field, userId)
        .single();

    if (!student) {
        return (
            <div className="p-4 text-center">
                <p className="text-red-500">会員情報が見つかりません</p>
            </div>
        );
    }

    // 今後のレッスン一覧を取得（キャンセル可能なもの）
    const now = new Date().toISOString();
    const { data: upcomingLessons } = await client
        .from('lessons')
        .select(`
            id,
            lesson_date,
            location,
            status,
            profiles ( full_name )
        `)
        .eq('student_id', student.id)
        .gte('lesson_date', now)
        .neq('status', 'cancelled')
        .order('lesson_date', { ascending: true });

    return (
        <div className="space-y-6 pb-20">
            {/* ヘッダー */}
            <div className="flex items-center gap-3">
                <Link
                    href="/member/dashboard"
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft size={20} className="text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">レッスンのキャンセル</h1>
                    <p className="text-xs text-gray-500 mt-0.5">予約済みのレッスンを確認・キャンセルできます</p>
                </div>
            </div>

            {/* ポリシー説明カード */}
            <div className="glass-card p-5 bg-gradient-to-br from-blue-50/80 to-white/80 border-blue-100/60">
                <h2 className="font-black text-gray-800 mb-3 flex items-center gap-2 text-sm">
                    <CalendarX className="w-4 h-4 text-blue-500" />
                    キャンセルポリシー
                </h2>
                <div className="space-y-2">
                    <div className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
                        <div>
                            <span className="font-bold text-gray-700">前日12:00まで</span>
                            <span className="text-gray-500 ml-2">→ キャンセル料なし（チケット振替）</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
                        <div>
                            <span className="font-bold text-gray-700">前日12:00以降</span>
                            <span className="text-gray-500 ml-2">→ キャンセル料100%（チケット消化）</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 残チケット表示 */}
            <div className="flex items-center justify-between bg-white/60 backdrop-blur-sm rounded-2xl border border-white/60 px-5 py-3 shadow-sm">
                <span className="text-sm text-gray-600 font-medium">現在の残チケット</span>
                <span className="text-2xl font-black text-blue-600">
                    {student.current_tickets || 0}
                    <span className="text-sm font-bold text-gray-500 ml-1">枚</span>
                </span>
            </div>

            {/* レッスン一覧 */}
            <CancelUpcomingLessons
                lessons={upcomingLessons || []}
                studentId={student.id}
            />
        </div>
    );
}
