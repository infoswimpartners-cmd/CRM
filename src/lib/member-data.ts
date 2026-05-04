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
    if (authError || !user) return { user: null, student: null, isTrioMember: false, isPersonalMember: false };

    // 2. Student Data
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
        if (studentError.code !== 'PGRST116') {
            console.error('Error fetching cached student data:', studentError.message || studentError);
        }
        return { user, student: null, isTrioMember: false, isPersonalMember: false };
    }

    // 会員種別の判定（独立したフラグとして管理）
    // Trio会員: is_trioフラグがtrueであること
    const isTrioMember = !!student.is_trio;
    
    // 個人レッスン会員: 有効なプラン（membership_type_id）が設定されていること
    const isPersonalMember = !!student.membership_type_id;

    return { 
        user, 
        student, 
        isTrioMember, 
        isPersonalMember 
    };
});
