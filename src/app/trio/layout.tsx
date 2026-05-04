import { ReactNode } from "react";
import MemberHeader from "@/components/layout/MemberHeader";
import MemberBottomNav from "@/components/layout/MemberBottomNav";
import { createClient } from "@/lib/supabase/server";
import { getCachedMemberData } from "@/lib/member-data";

/**
 * TrioPublicLayout
 * サイト全体の共通ナビゲーション（ヘッダー・フッター）を統合
 */
export default async function TrioPublicLayout({ children }: { children: ReactNode }) {
    const { user, student, isTrioMember, isPersonalMember } = await getCachedMemberData();
    const supabase = await createClient();

    let unreadCount = 0;
    let studentName = "";
    let planName = "";

    if (user && student) {
        studentName = student.full_name || "";
        planName = student.membership_types?.name || "";

        // 通知カウントの取得
        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', student.id)
            .eq('is_read', false);
        unreadCount = count || 0;
    }

    return (
        <div className="min-h-screen bg-white text-slate-900 selection:bg-sky-500/30">
            <div className="flex flex-col min-h-screen">
                {/* サイト共通ヘッダー */}
                <MemberHeader 
                    unreadCount={unreadCount} 
                    studentName={studentName} 
                    planName={planName} 
                    isTrioMember={isTrioMember} 
                />
                
                <main className="flex-1">
                    {children}
                </main>

                {/* モバイル共通ボトムナビ */}
                <MemberBottomNav isTrioMember={isTrioMember} />
            </div>
        </div>
    );
}
