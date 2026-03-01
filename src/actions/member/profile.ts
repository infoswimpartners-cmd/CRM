'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateMemberProfile(prevState: any, formData: FormData) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user?.id) {
            return { error: 'セッションが有効ではありません。再度ログインしてください。' }
        }

        // 1. Get student ID associated with this auth user
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id')
            .eq('auth_user_id', session.user.id)
            .single();

        if (studentError || !student) {
            return { error: '生徒情報が見つかりません。' }
        }

        // 2. Prepare data
        const updates = {
            full_name: formData.get('full_name') as string,
            full_name_kana: formData.get('full_name_kana') as string,
            contact_phone: formData.get('contact_phone') as string,
            gender: formData.get('gender') as string,
            birth_date: formData.get('birth_date') as string || null,

            second_student_name: formData.get('second_student_name') as string || null,
            second_student_name_kana: formData.get('second_student_name_kana') as string || null,
            second_student_gender: formData.get('second_student_gender') as string || null,
            second_student_birth_date: formData.get('second_student_birth_date') as string || null,
        }

        // Optional validation here if required.

        // 3. Update student table
        const { error: updateError } = await supabase
            .from('students')
            .update(updates)
            .eq('id', student.id);

        if (updateError) throw updateError;

        revalidatePath('/member/profile');
        revalidatePath('/member/dashboard');

        return { success: '基本情報を更新しました。' }

    } catch (e: any) {
        console.error('Update profile error:', e);
        return { error: '更新に失敗しました: ' + (e.message || '不明なエラー') }
    }
}
