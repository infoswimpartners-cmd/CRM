import { cache } from 'react';
import { createClient } from './supabase/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';
import { createAdminClient } from './supabase/admin';

/**
 * ログイン中のユーザー情報と生徒情報をキャッシュ付きで取得します。
 * Next.jsのlayoutとpageで同じデータを取得する際の無駄な重複リクエストを防ぎます。
 */
export const getCachedMemberData = cache(async () => {
    const supabase = await createClient();

    // 1. Check Sessions
    const nextAuthSession = await getServerSession(authOptions);
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    
    const lineUserId = nextAuthSession?.user ? (nextAuthSession.user as any).id : null;
    const authUserId = supabaseUser?.id || null;

    if (!lineUserId && !authUserId) {
        return { user: null, student: null, isTrioMember: false, isPersonalMember: false };
    }

    // 2. Fetch Student Data
    const supabaseAdmin = createAdminClient();
    
    let query = supabaseAdmin
        .from('students')
        .select(`
            *,
            membership_types!students_membership_type_id_fkey(
                id, name, monthly_lesson_limit, fee
            )
        `);

    if (lineUserId && authUserId) {
        query = query.or(`auth_user_id.eq.${authUserId},line_user_id.eq.${lineUserId}`);
    } else if (lineUserId) {
        query = query.eq('line_user_id', lineUserId);
    } else {
        query = query.eq('auth_user_id', authUserId);
    }

    const { data: student, error: studentError } = await query.single();

    if (studentError) {
        if (studentError.code !== 'PGRST116') {
            console.error('Error fetching cached student data:', studentError.message || studentError);
        }
        return { user: supabaseUser, student: null, isTrioMember: false, isPersonalMember: false };
    }

    // 会員種別の判定（独立したフラグとして管理）
    // Trio会員: is_trioフラグがtrueであること
    const isTrioMember = !!student.is_trio;
    
    // 個人レッスン会員: 有効なプラン（membership_type_id）が設定されていること
    const isPersonalMember = !!student.membership_type_id;

    return { 
        user: supabaseUser || (nextAuthSession?.user as any), 
        student, 
        isTrioMember, 
        isPersonalMember 
    };
});
