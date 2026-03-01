import { cache } from 'react';
import { createClient } from './supabase/server';

/**
 * ログイン中のユーザー情報と生徒情報をキャッシュ付きで取得します。
 * Next.jsのlayoutとpageで同じデータを取得する際の無駄な重複リクエストを防ぎます。
 */
export const getCachedMemberData = cache(async () => {
    const supabase = await createClient();

    // 1. Auth User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { user: null, student: null };

    // 2. Student Data (Commonly used fields)
    const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
            *,
            membership_types!students_membership_type_id_fkey(
                id, name, monthly_lesson_limit, fee
            )
        `)
        .eq('auth_user_id', user.id)
        .single();

    if (studentError) {
        console.error('Error fetching cached student data:', studentError);
        return { user, student: null };
    }

    return { user, student };
});
