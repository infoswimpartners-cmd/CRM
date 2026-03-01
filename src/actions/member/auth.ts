'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';

export type LinkResult = {
    success: boolean;
    message: string;
    studentId?: string;
    error?: string;
};

export async function linkStudentData(): Promise<LinkResult> {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user) {
        return { success: false, message: 'ユーザーが見つかりません', error: 'User not found' };
    }

    try {
        // 1. Check if already linked
        const { data: existingStudent } = await supabase
            .from('students')
            .select('id')
            .eq('auth_user_id', user.id)
            .single();

        if (existingStudent) {
            return {
                success: true,
                message: '既に連携済みです',
                studentId: existingStudent.id
            };
        }

        // 2. Try to link by LINE User ID (Provider Metadata)
        const lineUserId = user.app_metadata.provider === 'line' ? user.user_metadata.sub : null;

        if (lineUserId) {
            const { data: studentByLine } = await supabase
                .from('students')
                .select('id')
                .eq('line_user_id', lineUserId)
                .single();

            if (studentByLine) {
                // Update auth_user_id
                const { error: updateError } = await supabase
                    .from('students')
                    .update({ auth_user_id: user.id })
                    .eq('id', studentByLine.id);

                if (updateError) throw updateError;

                return {
                    success: true,
                    message: 'LINEアカウントと連携しました',
                    studentId: studentByLine.id
                };
            }
        }

        // 3. Try to link by Email
        if (user.email) {
            const { data: studentByEmail } = await supabase
                .from('students')
                .select('id')
                .ilike('contact_email', user.email)
                .is('auth_user_id', null) // Only if not already linked
                .single();

            if (studentByEmail) {
                const { error: updateError } = await supabase
                    .from('students')
                    .update({ auth_user_id: user.id })
                    .eq('id', studentByEmail.id);

                if (updateError) throw updateError;

                return {
                    success: true,
                    message: 'メールアドレスで連携しました',
                    studentId: studentByEmail.id
                };
            }
        }

        // No match found
        return {
            success: false,
            message: '連携可能な会員データが見つかりませんでした。',
            error: 'No matching student record'
        };

    } catch (error: any) {
        console.error('Link Student Data Error:', error);
        return {
            success: false,
            message: 'システムエラーが発生しました',
            error: error.message
        };
    }
}

/**
 * NextAuthのLINEログインセッションを使用して生徒データを連携する
 */
export async function linkLineAccount(lineUserId: string, email?: string): Promise<LinkResult> {
    const admin = createAdminClient();

    try {
        // 1. すでに連携されているか確認
        const { data: existingStudent } = await admin
            .from('students')
            .select('id')
            .eq('line_user_id', lineUserId)
            .single();

        if (existingStudent) {
            return { success: true, message: '既に連携済みです', studentId: existingStudent.id };
        }

        // 2. メールアドレスで検索して連携
        if (email) {
            const { data: studentByEmail } = await admin
                .from('students')
                .select('id')
                .ilike('contact_email', email)
                .is('line_user_id', null)
                .single();

            if (studentByEmail) {
                const { error: updateError } = await admin
                    .from('students')
                    .update({ line_user_id: lineUserId })
                    .eq('id', studentByEmail.id);

                if (updateError) throw updateError;

                return {
                    success: true,
                    message: 'LINEアカウントをメールアドレスで連携しました',
                    studentId: studentByEmail.id
                };
            }
        }

        return {
            success: false,
            message: '連携可能な会員データが見つかりませんでした。',
            error: 'No matching student record'
        };
    } catch (error: any) {
        console.error('Link LINE Account Error:', error);
        return {
            success: false,
            message: '連携処理中にエラーが発生しました',
            error: error.message
        };
    }
}
/**
 * 本人確認（メール・電話）を行い、有効化可能かチェックする
 */
export async function verifyMemberForActivation(email: string, phone: string) {
    const admin = createAdminClient();

    // 前後の空白を削除
    const targetEmail = email.trim();
    const targetPhone = phone.trim();

    try {
        const { data: student, error } = await admin
            .from('students')
            .select('id, full_name, auth_user_id')
            .ilike('contact_email', targetEmail)
            .eq('contact_phone', targetPhone)
            .single();

        if (error || !student) {
            return {
                success: false,
                message: 'ご入力いただいた情報と一致する会員登録が見つかりませんでした。スペルやハイフンの有無をご確認ください。'
            };
        }

        if (student.auth_user_id) {
            return {
                success: false,
                message: 'このアカウントは既に有効化されています。通常のログイン画面からログインしてください。',
                isAlreadyActivated: true
            };
        }

        return {
            success: true,
            studentId: student.id,
            fullName: student.full_name,
            email: targetEmail
        };
    } catch (e) {
        return { success: false, message: 'システムエラーが発生しました。' };
    }
}
/**
 * 現在ログインしているユーザーのLINE連携情報を生徒データに反映させる
 */
export async function syncLineId(): Promise<LinkResult> {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user) return { success: false, message: 'ユーザーが見つかりません' };

    // identities または user_metadata から LINE ID を取得
    const lineUserId = user.identities?.find(id => id.provider === 'line')?.id ||
        (user.app_metadata.provider === 'line' ? user.user_metadata.sub : null);

    if (!lineUserId) {
        return { success: false, message: 'LINE連携情報が見つかりません' };
    }

    try {
        const { error } = await supabase
            .from('students')
            .update({ line_user_id: lineUserId })
            .eq('auth_user_id', user.id);

        if (error) throw error;

        return { success: true, message: 'LINE IDを同期しました' };
    } catch (error: any) {
        console.error('Sync LINE ID Error:', error);
        return { success: false, message: '同期に失敗しました', error: error.message };
    }
}

/**
 * ログアウト処理
 */
export async function memberSignOut() {
    try {
        const supabase = await createClient();
        // セッションがある場合のみサインアウトを試行
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (session) {
            await supabase.auth.signOut();
        }
    } catch (error) {
        console.error('SignOut error:', error);
    } finally {
        redirect('/member/login');
    }
}
