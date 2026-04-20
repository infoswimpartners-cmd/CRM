'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

/**
 * 登録されているすべてのAuthユーザーを取得します
 * ※ 管理者専用のアクションです
 */
export async function getAllAuthUsers() {
    try {
        const supabaseAdmin = createAdminClient();
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) {
            console.error('Error fetching auth users:', error);
            return { success: false, error: 'ユーザーの取得に失敗しました。' };
        }

        // 必要な情報だけを抽出して返す
        const users = data.users.map((u) => ({
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            // LINE連携などでメールアドレスがない場合はプロバイダー等から識別子を取り出す
            // もし raw_user_meta_data に name があればそれも使う
            name: u.user_metadata?.full_name || u.user_metadata?.name || '',
            provider: u.app_metadata?.provider || 'email'
        }));

        return { success: true, users };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * 生徒データにAuthユーザーを手動で紐付ける
 */
export async function linkStudentToAuthUser(studentId: string, authUserId: string) {
    try {
        const supabaseAdmin = createAdminClient();

        // auth_user_id はUNIQUE制約がかかっている可能性があるため、
        // すでに別の生徒に紐付いている場合はエラーになるのが正常な挙動です
        const { error } = await supabaseAdmin
            .from('students')
            .update({ auth_user_id: authUserId })
            .eq('id', studentId);

        if (error) {
            console.error('Error linking auth user:', error);
            return { success: false, error: '連携に失敗しました。このアカウントは既に他の生徒と紐付いている可能性があります。' };
        }

        revalidatePath('/customers');
        revalidatePath(`/customers/${studentId}`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * 生徒データのAuthユーザー紐付けを解除する
 */
export async function unlinkStudentAuthUser(studentId: string) {
    try {
        const supabaseAdmin = createAdminClient();

        const { error } = await supabaseAdmin
            .from('students')
            .update({ auth_user_id: null })
            .eq('id', studentId);

        if (error) {
            console.error('Error unlinking auth user:', error);
            return { success: false, error: '解除に失敗しました。' };
        }

        revalidatePath('/customers');
        revalidatePath(`/customers/${studentId}`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
