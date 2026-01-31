'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

interface VerificationResult {
    success: boolean
    email?: string
    name?: string
    error?: string
}

export async function verifyInvitationToken(token: string): Promise<VerificationResult> {
    if (!token) {
        return { success: false, error: 'トークンが無効です' }
    }

    const supabase = createAdminClient()

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('email, full_name, invitation_expires_at, status')
        .eq('invitation_token', token)
        .single()

    if (error || !profile) {
        return { success: false, error: '無効な招待URLです。' }
    }

    if (profile.status === 'active') {
        return { success: false, error: 'このアカウントは既に登録が完了しています。ログイン画面からログインしてください。' }
    }

    // Check expiration
    if (new Date(profile.invitation_expires_at) < new Date()) {
        return { success: false, error: '招待URLの有効期限が切れています。管理者に連絡して再招待を依頼してください。' }
    }

    return {
        success: true,
        email: profile.email,
        name: profile.full_name
    }
}

export async function completeRegistration(token: string, password: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createAdminClient()

    // 1. Validate Token Again (Security)
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, invitation_expires_at')
        .eq('invitation_token', token)
        .single()

    if (error || !profile) {
        return { success: false, error: '無効なトークンです。' }
    }

    if (new Date(profile.invitation_expires_at) < new Date()) {
        return { success: false, error: '有効期限切れです。' }
    }

    try {
        // 2. Update Password in Auth
        const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
            profile.id,
            { password: password }
        )

        if (updateAuthError) {
            console.error('Password Update Error:', updateAuthError)
            return { success: false, error: 'パスワードの設定に失敗しました。' }
        }

        // 3. Update Profile (Activate)
        const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({
                status: 'active',
                invitation_token: null, // Consume token
                must_change_password: false // They just set it
            })
            .eq('id', profile.id)

        if (updateProfileError) {
            console.error('Profile Activate Error:', updateProfileError)
            return { success: false, error: 'プロフィールの更新に失敗しました。' }
        }

        return { success: true }

    } catch (err: any) {
        console.error('Registration Error:', err)
        return { success: false, error: '予期せぬエラーが発生しました。' }
    }
}
