import { ReactNode } from "react";
import MemberHeader from "@/components/layout/MemberHeader";
import MemberBottomNav from "@/components/layout/MemberBottomNav";
import MemberDesktopSidebar from "@/components/layout/MemberDesktopSidebar";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { getCachedMemberData } from "@/lib/member-data";

export default async function MembersLayout({ children }: { children: ReactNode }) {
    const { user, student } = await getCachedMemberData();
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
        <div className="min-h-screen flex w-full bg-blue-50/10">
            <MemberDesktopSidebar studentName={studentName} />
            <div className="flex-1 flex flex-col min-w-0">
                <MemberHeader unreadCount={unreadCount} studentName={studentName} planName={planName} />
                <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
                    {children}
                </main>
                <MemberBottomNav />
            </div>
        </div>
    );
}
