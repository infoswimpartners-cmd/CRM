'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'
import { addDays } from 'date-fns'
import { revalidatePath } from 'next/cache'

/**
 * Generates a generic invitation token for self-registration.
 */
export async function createGenericInvitation(): Promise<{ success?: boolean; url?: string; error?: string }> {
    try {
        const supabase = createAdminClient()
        const token = randomUUID()
        // Expires in 3 days
        const expiresAt = addDays(new Date(), 3).toISOString()

        const { error } = await supabase
            .from('coach_invitations')
            .insert({
                token: token,
                expires_at: expiresAt,
                is_used: false
            })

        if (error) {
            console.error('Invite Creation Error:', error)
            return { error: '招待リンクの作成に失敗しました。' }
        }

        const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://manager.swim-partners.com'}/auth/signup?token=${token}`
        return { success: true, url: signupUrl }

    } catch (err) {
        console.error(err)
        return { error: '予期せぬエラーが発生しました。' }
    }
}

/**
 * Verifies if a signup token is valid.
 */
export async function verifySignupToken(token: string): Promise<{ valid: boolean; error?: string }> {
    if (!token) return { valid: false, error: 'トークンがありません。' }

    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('coach_invitations')
        .select('expires_at, is_used')
        .eq('token', token)
        .single()

    if (error || !data) {
        return { valid: false, error: '無効な招待リンクです。' }
    }

    if (data.is_used) {
        return { valid: false, error: 'このリンクは既に使用されています。' }
    }

    if (new Date(data.expires_at) < new Date()) {
        return { valid: false, error: 'リンクの有効期限が切れています。' }
    }

    return { valid: true }
}

/**
 * Registers a coach using a generic invitation token.
 */
export async function registerCoachWithToken(prevState: any, formData: FormData): Promise<{ success?: boolean; error?: string }> {
    const token = formData.get('token') as string
    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!token || !fullName || !email || !password) {
        return { error: '必須項目が未入力です。' }
    }

    if (password !== confirmPassword) {
        return { error: 'パスワードが一致しません。' }
    }

    if (password.length < 8) {
        return { error: 'パスワードは8文字以上で設定してください。' }
    }

    const supabase = createAdminClient()

    // 1. Verify Token Again
    const { valid, error: tokenError } = await verifySignupToken(token)
    if (!valid) return { error: tokenError }

    try {
        // 2. Create Auth User
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        })

        if (authError) {
            return { error: `ユーザー登録エラー: ${authError.message}` }
        }

        if (!authUser.user) return { error: 'ユーザー作成に失敗しました。' }

        // 3. Create Profile
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authUser.user.id,
                email: email,
                full_name: fullName,
                role: 'coach',
                status: 'active', // Active immediately
                must_change_password: false
            })

        if (profileError) {
            // Cleanup Auth User if allowed, or manual cleanup needed.
            console.error('Profile creation failed:', profileError)
            return { error: 'プロフィール作成に失敗しました。管理者に問い合わせてください。' }
        }

        // 4. Mark Token as Used
        await supabase
            .from('coach_invitations')
            .update({ is_used: true })
            .eq('token', token)

        return { success: true }

    } catch (err: any) {
        console.error('Registration Error:', err)
        return { error: '予期せぬエラーが発生しました。' }
    }
}
