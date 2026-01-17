'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { emailService } from '@/lib/email'

interface CreateCoachState {
    success?: boolean
    error?: string
}

export async function createCoach(prevState: CreateCoachState, formData: FormData): Promise<CreateCoachState> {
    const email = formData.get('email') as string
    const fullName = formData.get('fullName') as string

    if (!email || !fullName) {
        return { error: 'メールアドレスと氏名は必須です。' }
    }

    try {
        // 1. Create User using a clean, non-session client (using logic similar to a new signup)
        // We use the JS client directly to avoid messing with Next.js cookies/headers
        const tempClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Generate random password
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)

        // Ideally we would use 'inviteUserByEmail' but that requires SERVICE_ROLE_KEY
        // So we use signUp, which sends a confirmation email if configured, or just creates the user
        const { data: authData, error: authError } = await tempClient.auth.signUp({
            email,
            password: tempPassword,
            options: {
                data: {
                    full_name: fullName,
                }
            }
        })

        if (authError) {
            console.error('Signup Error:', authError)
            if (authError.status === 429) {
                return { error: 'セキュリティ保護のため、リクエストが制限されています。30秒〜1分ほど待ってから再試行してください。' }
            }
            return { error: `エラー: ${authError.message} (Code: ${authError.status || 'Unknown'})` }
        }

        if (!authData.user) {
            return { error: 'ユーザーが作成されませんでした。' }
        }

        // Check if email confirmation is enabled/required
        const isEmailConfirmationRequired = !authData.session

        // VERIFY: Only try to sign in if we expect a session (Auto Confirm ON)
        // If confirmation is required, signInWithPassword will fail anyway (Email not confirmed),
        // so we skip this check and assume a new user was created successfully.
        if (!isEmailConfirmationRequired) {
            const { error: signInError } = await tempClient.auth.signInWithPassword({
                email,
                password: tempPassword
            })

            if (signInError) {
                console.error('Password Verification Error:', signInError)
                return {
                    error: 'このメールアドレスは既に登録されており、パスワードが一致しません。Supabaseの管理画面(Auth)からユーザーを削除してから再試行してください。'
                }
            }
        }

        const newUserId = authData.user.id

        // 2. Elevate to Coach Role using Admin's session
        const supabase = await createServerClient()

        // Manual insert with must_change_password flag
        const { error: insertError } = await supabase
            .from('profiles')
            .upsert({
                id: newUserId,
                email: email,
                full_name: fullName,
                role: 'coach',
                avatar_url: '',
                must_change_password: true
            })

        if (insertError) {
            console.error('Profile Creation Error:', insertError)
            if (insertError.code === '23503') {
                return {
                    error: 'このメールアドレスは既にシステムに登録されています。以前削除したコーチの場合、SupabaseのAuth管理画面からユーザーを完全に削除するか、別のメールアドレスを使用してください。'
                }
            }
            return { error: `ユーザーは作成されましたが、プロフィールの作成に失敗しました: ${insertError.message}` }
        }

        // 3. Send Email
        try {
            // variable defined above

            await emailService.sendEmail({
                to: email,
                subject: '【Swim Partners】コーチアカウントが作成されました',
                text: `
${fullName} 様

Swim Partnersのコーチアカウントが作成されました。
以下の情報でログインしてください。

ログインURL: ${process.env.NEXT_PUBLIC_APP_URL || 'https://manager.swim-partners.com'}/login
ID (Email): ${email}
初期パスワード: ${tempPassword}

${isEmailConfirmationRequired ? '【重要】別途Supabaseから届く「確認メール」のリンクを先にクリックしてください。そうしないとログインできません。' : ''}
※初回ログイン時にパスワードの変更が必要です。
                `
            })

            if (isEmailConfirmationRequired) {
                return { success: true, error: 'ユーザーを作成しましたが、メール確認が必要です。Supabaseから届く確認メールをチェックしてください。' }
            }

        } catch (emailError) {
            console.error('Email Send Error:', emailError)
        }

        revalidatePath('/admin/coaches')
        return { success: true }

    } catch (err: any) {
        console.error('Unexpected setup error:', err)
        return { error: '予期せぬエラーが発生しました。' }
    }
}

export async function deleteCoach(coachId: string): Promise<{ success?: boolean; error?: string }> {
    const supabase = await createServerClient()

    try {
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

        revalidatePath('/admin/coaches')
        return { success: true }
    } catch (err: any) {
        return { error: '予期せぬエラーが発生しました。' }
    }
}
