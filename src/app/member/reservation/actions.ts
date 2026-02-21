'use server';

import { createClient } from '@/lib/supabase/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function bookLesson(scheduleId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const session = await getServerSession(authOptions);

    let studentId = null;

    if (user) {
        const { data: student } = await supabase
            .from('students')
            .select('id')
            .eq('auth_user_id', user.id)
            .single();
        studentId = student?.id;
    } else if (session?.user) {
        const lineUserId = (session.user as any).id;
        const adminClient = createAdminClient();
        const { data: student } = await adminClient
            .from('students')
            .select('id')
            .eq('line_user_id', lineUserId)
            .single();
        studentId = student?.id;
    }

    if (!studentId) {
        throw new Error('Student not found');
    }

    const adminClient = createAdminClient();

    // 1. Check if schedule is still open
    const { data: schedule, error: fetchError } = await adminClient
        .from('lesson_schedules')
        .select('*')
        .eq('id', scheduleId)
        .single();

    if (fetchError || !schedule) {
        throw new Error('Schedule not found');
    }

    if (schedule.status !== 'open') {
        throw new Error('この枠は既に予約済みか、受付を終了しました。');
    }

    // 2. Request the slot (Update status)
    const { error: updateError } = await adminClient
        .from('lesson_schedules')
        .update({
            status: 'requested',
            student_id: studentId
        })
        .eq('id', scheduleId);

    if (updateError) {
        console.error('Update Error:', updateError);
        throw new Error('予約リクエストの送信に失敗しました。');
    }

    // No lesson insert yet. Coach approval will create the lesson record.

    revalidatePath('/member/reservation');
    redirect('/member/dashboard?success=reservation_requested');
}
