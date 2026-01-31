'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { emailService } from '@/lib/email'
import { randomUUID } from 'crypto'
import { addHours } from 'date-fns'

interface CreateCoachState {
    success?: boolean
    error?: string
    invitationUrl?: string
}

export async function createCoach(prevState: CreateCoachState, formData: FormData): Promise<CreateCoachState> {
    const email = formData.get('email') as string
    const fullName = formData.get('fullName') as string

    if (!email || !fullName) {
        return { error: 'メールアドレスと氏名は必須です。' }
    }

    try {
        const supabase = createAdminClient()

        // 1. Check if user already exists in profiles (Soft check before Auth)
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single()

        if (existingProfile) {
            return { error: 'このメールアドレスは既に登録されています。' }
        }

        // 2. Create User via Admin API
        // We set a random password that the user doesn't know. They will set their own via the invite link.
        const tempPassword = randomUUID() + randomUUID() // Long random string

        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: tempPassword,
            email_confirm: true, // Auto-confirm email so they can sign in after password reset
            user_metadata: { full_name: fullName }
        })

        if (authError) {
            console.error('Create User Error:', authError)
            return { error: `ユーザー作成エラー: ${authError.message}` }
        }

        if (!authUser.user) {
            return { error: 'ユーザー作成に失敗しました。' }
        }

        const userId = authUser.user.id

        // 3. Generate Invitation Token
        const invitationToken = randomUUID()
        const expiresAt = addHours(new Date(), 24).toISOString() // 24 hours validity

        // 4. Create Profile with Pending Status
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                email: email,
                full_name: fullName,
                role: 'coach',
                status: 'pending',
                invitation_token: invitationToken,
                invitation_expires_at: expiresAt,
                must_change_password: false // They set it initially, so no need to force change immediately after
            })

        if (profileError) {
            // Cleanup: Delete auth user if profile creation fails? 
            // Ideally yes, but for now just report error. Admin can delete manually.
            console.error('Profile Insert Error:', profileError)
            return { error: `プロフィール作成エラー: ${profileError.message}` }
        }

        // 5. Send Invitation Email
        await sendInvitationEmail(email, fullName, invitationToken)

        // Generate URL for immediate display
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://manager.swim-partners.com'}/auth/invite?token=${invitationToken}`

        revalidatePath('/admin/coaches')
        return { success: true, invitationUrl: inviteUrl }

    } catch (err: any) {
        console.error('Unexpected setup error:', err)
        return { error: '予期せぬエラーが発生しました。' }
    }
}

export async function resendInvitation(coachId: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const supabase = createAdminClient()

        // Fetch current profile
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('email, full_name, status')
            .eq('id', coachId)
            .single()

        if (fetchError || !profile) {
            return { error: 'コーチ情報が見つかりません。' }
        }

        if (profile.status === 'active') {
            return { error: 'このコーチは既に登録完了しています。' }
        }

        // Generate new token
        const newToken = randomUUID()
        const newExpiresAt = addHours(new Date(), 24).toISOString()

        // Update Profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                invitation_token: newToken,
                invitation_expires_at: newExpiresAt
            })
            .eq('id', coachId)

        if (updateError) {
            return { error: 'トークンの更新に失敗しました。' }
        }

        // Send Email
        await sendInvitationEmail(profile.email, profile.full_name || '', newToken)

        revalidatePath('/admin/coaches')
        return { success: true }

    } catch (err: any) {
        console.error('Resend error:', err)
        return { error: '再招待の送信に失敗しました。' }
    }
}

async function sendInvitationEmail(email: string, name: string, token: string) {
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://manager.swim-partners.com'}/auth/invite?token=${token}`

    await emailService.sendEmail({
        to: email,
        subject: '【Swim Partners】コーチアカウント招待のお知らせ',
        text: `
${name} 様

Swim Partnersのコーチアカウントとして招待されました。
以下のリンクからパスワードを設定し、登録を完了してください。

■パスワード設定URL (24時間有効)
${inviteUrl}

※このURLの有効期限は24時間です。期限が切れた場合は管理者に再招待を依頼してください。

--------------------------------------------------
Swim Partners Manager
        `
    })
}

export async function deleteCoach(coachId: string): Promise<{ success?: boolean; error?: string }> {
    const supabase = createAdminClient() // Use Admin Client to delete from Auth as well

    try {
        // 1. Delete from Profiles (This logic is same as before, check foreign keys)
        // Actually, if we use Admin Client, we can delete user from Auth, and CASCADE handles profile?
        // But our `profiles` table might not ideally cascade on delete user in Supabase if RLS is tricky.
        // Let's stick to deleting profile first to check constraints.

        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', coachId)

        if (error) {
            console.error('Delete Error:', error)
            if (error.code === '23503') { // Foreign Key Violation
                return { error: 'このコーチはレッスン履歴や担当生徒が存在するため削除できません。' }
            }
            return { error: `削除に失敗しました: ${error.message}` }
        }

        // 2. Delete from Auth (Cleanup)
        // If profile delete succeeded, we should cleanup the auth user too.
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(coachId)
        if (authDeleteError) {
            console.error('Auth Delete Warning:', authDeleteError)
            // Non-fatal, profile is gone.
        }

        revalidatePath('/admin/coaches')
        return { success: true }
    } catch (err: any) {
        return { error: '予期せぬエラーが発生しました。' }
    }
}

export async function getInvitationUrl(coachId: string): Promise<{ success?: boolean; url?: string; error?: string }> {
    try {
        const supabase = createAdminClient()

        // Fetch current profile
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('invitation_token, status, invitation_expires_at')
            .eq('id', coachId)
            .single()

        if (fetchError || !profile) {
            return { error: 'コーチ情報が見つかりません。' }
        }

        if (profile.status === 'active') {
            return { error: 'このコーチは既に登録完了しています。' }
        }

        // Check expiration
        if (new Date(profile.invitation_expires_at) < new Date()) {
            return { error: '有効期限が切れています。「再招待」を行ってください。' }
        }

        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://manager.swim-partners.com'}/auth/invite?token=${profile.invitation_token}`

        return { success: true, url: inviteUrl }

    } catch (err) {
        console.error('getInvitationUrl error:', err)
        return { error: 'URLの取得に失敗しました。' }
    }
}
