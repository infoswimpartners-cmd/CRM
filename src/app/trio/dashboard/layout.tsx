import { ReactNode } from "react";
import MemberHeader from "@/components/layout/MemberHeader";
import MemberBottomNav from "@/components/layout/MemberBottomNav";
import MemberDesktopSidebar from "@/components/layout/MemberDesktopSidebar";
import { createClient } from "@/lib/supabase/server";
import { getCachedMemberData } from "@/lib/member-data";
import TrioBottomNav from "@/components/trio/TrioBottomNav";

export default async function TrioLayout({ children }: { children: ReactNode }) {
    const { user, student, isTrioMember } = await getCachedMemberData();
    const supabase = await createClient();

    let unreadCount = 0;
    let studentName = "";
    let planName = "";

    if (user && student) {
        studentName = student.full_name || "";
        planName = student.membership_types?.name || "";

        // 通知カウントのみ別途取得（状況により変化するため）
        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', student.id)
            .eq('is_read', false);
        unreadCount = count || 0;
    }

    return (
        <div className="dark min-h-screen flex w-full bg-[#0A192F] text-slate-200">
            <MemberDesktopSidebar studentName={studentName} isTrioMember={isTrioMember} />
            <div className="flex-1 flex flex-col min-w-0">
                {/* TRIO専用のヘッダースタイル調整（ダークモード対応） */}
                <div className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0A192F]/80 backdrop-blur-xl">
                    <MemberHeader unreadCount={unreadCount} studentName={studentName} planName={planName} isTrioMember={isTrioMember} />
                </div>
                
                <main className="flex-1 container mx-auto px-4 py-8 mb-24 max-w-5xl">
                    {children}
                </main>
                
                <TrioBottomNav />
            </div>
        </div>
    );
}
