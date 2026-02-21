import { ReactNode } from "react";
import MemberHeader from "@/components/layout/MemberHeader";
import MemberBottomNav from "@/components/layout/MemberBottomNav";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function MembersLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const session = await getServerSession(authOptions);

    let unreadCount = 0;
    let studentName = "";

    if (user || session?.user) {
        const userId = user?.id || (session?.user as any)?.id;
        const field = user ? 'auth_user_id' : 'line_user_id';
        const client = user ? supabase : createAdminClient();

        // 1. Get student ID and Name
        const { data: student } = await client
            .from('students')
            .select('id, full_name')
            .eq(field, userId)
            .single();

        if (student) {
            studentName = student.full_name || "";
            const { count } = await client
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('student_id', student.id)
                .eq('is_read', false);
            unreadCount = count || 0;
        }
    }

    return (
        <>
            <MemberHeader unreadCount={unreadCount} studentName={studentName} />
            <main className="flex-1 container mx-auto px-4 py-8">
                {children}
            </main>
            <MemberBottomNav />
        </>
    );
}
