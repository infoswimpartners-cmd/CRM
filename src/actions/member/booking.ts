'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function submitBookingRequest(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'ログインが必要です' };
    }

    const dateStr = formData.get('date') as string;
    const timeStr = formData.get('time') as string; // "10:00"

    if (!dateStr || !timeStr) {
        return { success: false, message: '日時を選択してください' };
    }

    try {
        // 1. Get student ID
        const { data: student } = await supabase
            .from('students')
            .select('id, coach_id')
            .eq('auth_user_id', user.id)
            .single();

        if (!student) {
            return { success: false, message: '会員情報が見つかりません' };
        }

        if (!student.coach_id) {
            return { success: false, message: '担当コーチが設定されていません' };
        }

        // 2. Normalize DateTime
        // Combine date and time to ISO string
        // Assuming JST input for now, but handling dates correctly is tricky.
        // Let's store as timestamp with time zone.
        const startAt = new Date(`${dateStr}T${timeStr}:00+09:00`);

        // Default duration 60 mins (Todo: fetch from student membership/settings)
        const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

        // 3. Create Lesson Request
        const { error } = await supabase
            .from('lessons')
            .insert({
                student_id: student.id,
                coach_id: student.coach_id,
                start_at: startAt.toISOString(),
                end_at: endAt.toISOString(),
                status: 'requested',
                student_name: '（会員）', // temporary placeholder or fetch name
                location: '未定', // Set default or allow selection
                lesson_date: startAt.toISOString(), // Legacy column support
            });

        if (error) {
            console.error('Booking Error:', error);
            throw error;
        }

        revalidatePath('/member/schedule');
        revalidatePath('/member/dashboard');

        return { success: true, message: '予約リクエストを送信しました' };

    } catch (error: any) {
        return { success: false, message: '予約リクエストの送信に失敗しました: ' + error.message };
    }
}
