import { createClient } from '@/lib/supabase/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { ReservationClient } from './client'; // Client component for interactivity
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function ReservationPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const session = await getServerSession(authOptions);

    if (!user && !session) {
        redirect('/member/login');
    }

    let student = null;
    const client = user ? supabase : createAdminClient();
    const field = user ? 'auth_user_id' : 'line_user_id';
    const userId = user ? user.id : (session?.user as any).id;

    const { data: studentData } = await client
        .from('students')
        .select('id, coach_id, student_coaches(coach_id)')
        .eq(field, userId)
        .single();

    student = studentData;

    if (!student) return <div>Student not found</div>;

    // Determine Coach ID
    let coachId = student.coach_id;
    if (!coachId && student.student_coaches && student.student_coaches.length > 0) {
        // @ts-ignore
        coachId = student.student_coaches[0].coach_id;
    }

    if (!coachId) {
        return <div className="p-8">担当コーチが設定されていません。管理者に連絡してください。</div>;
    }

    // Check Request Period (20th - 25th)
    const today = new Date();
    const day = today.getDate();
    // For testing, we might want to allow access. 
    // Requirement: "Request View (Calendar limited to 20-25th)"
    const isRequestPeriod = day >= 20 && day <= 25;

    // We can pass `isRequestPeriod` to client. 
    // If not period, we might show "Preview" but disable booking?
    // Or just block entirely. Requirement says "Request View" is limited.
    // Let's allow viewing but disable booking button if strict.
    // Or just show a message "Current period is not for requests".

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-2">
                <Link href="/member/dashboard" className="text-gray-500">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-2xl font-bold">レッスン予約</h1>
            </div>

            <ReservationClient
                coachId={coachId}
                isRequestPeriod={isRequestPeriod}
            />
        </div>
    );
}
