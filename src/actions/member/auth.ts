'use server';

import { createClient } from '@/lib/supabase/server';

export type LinkResult = {
    success: boolean;
    message: string;
    studentId?: string;
    error?: string;
};

export async function linkStudentData(): Promise<LinkResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

        // 3. Try to link by Email (Safe match only if email is verified, but LINE email is usually verified? 
        // Or if we trust the email. For now, strict match on contact_email)
        if (user.email) {
            const { data: studentByEmail } = await supabase
                .from('students')
                .select('id')
                .eq('contact_email', user.email)
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
