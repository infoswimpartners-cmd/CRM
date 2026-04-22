'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function submitTrioLessonRequest(data: {
    studentId: string;
    preferredDate?: string;
    preferredTimeSlot?: string;
    message?: string;
}) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('trio_lesson_requests')
        .insert([{
            student_id: data.studentId,
            preferred_date: data.preferredDate || null,
            preferred_time_slot: data.preferredTimeSlot || null,
            message: data.message || null,
            status: 'pending'
        }]);

    if (error) {
        console.error('Failed to submit trio lesson request:', error);
        return { success: false, error: 'リクエストの送信に失敗しました。時間をおいて再度お試しください。' };
    }

    revalidatePath('/trio/dashboard');
    return { success: true };
}

export async function getLatestTrioRequests(studentId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('trio_lesson_requests')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Failed to fetch trio lesson requests:', error);
        return { requests: [] };
    }

    return { requests: data };
}
