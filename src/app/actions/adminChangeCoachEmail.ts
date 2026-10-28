'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sanitizeEmail, isValidEmailFormat } from '@/lib/utils/emailValidation'

interface ChangeCoachEmailResult {
    success: boolean
    error?: string
    updatedEmail?: string
}

/**
 * 管理者がコーチの登録メールアドレスを変更する
 * （誤登録の復旧やアドレス変更対応用）
 */
export async function adminChangeCoachEmail(coachId: string, rawNewEmail: string): Promise<ChangeCoachEmailResult> {
    try {
        const supabase = await createClient()

        // 1. 実行者が管理者か確認
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: '認証エラーが発生しました。' }

        const { data: adminProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (adminProfile?.role !== 'admin') {
            return { success: false, error: 'この操作には管理者権限が必要です。' }
        }

        // 2. 入力メールアドレスのサニタイズと形式検証
        const sanitizedEmail = sanitizeEmail(rawNewEmail)

        if (!sanitizedEmail) {
            return { success: false, error: '新しいメールアドレスを入力してください。' }
        }

        if (!isValidEmailFormat(sanitizedEmail)) {
            return { success: false, error: '正しいメールアドレスの形式で入力してください。' }
        }

        const supabaseAdmin = createAdminClient()

        // 3. 対象コーチの現在プロファイルを取得
        const { data: targetProfile, error: targetError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name')
            .eq('id', coachId)
            .single()

        if (targetError || !targetProfile) {
            return { success: false, error: '対象のコーチが見つかりません。' }
        }

        if (targetProfile.email?.toLowerCase() === sanitizedEmail.toLowerCase()) {
            return { success: false, error: '現在と同じメールアドレスです。' }
        }

        // 4. 重複チェック（他のユーザーで既に使われていないか）
        const { data: existingUser } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', sanitizedEmail)
            .neq('id', coachId)
            .maybeSingle()

        if (existingUser) {
            return { success: false, error: 'このメールアドレスは既に他のアカウントで使用されています。' }
        }

        // 5. Supabase Auth (auth.users) のメールアドレスを更新
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
            coachId,
            {
                email: sanitizedEmail,
                email_confirm: true // 自動承認して即時ログイン可能にする
            }
        )

        if (authUpdateError) {
            console.error('Admin change coach email (Auth) error:', authUpdateError)
            return { success: false, error: `認証アカウントのメール更新に失敗しました: ${authUpdateError.message}` }
        }

        // 6. profiles テーブルのメールアドレスを更新
        const { error: profileUpdateError } = await supabaseAdmin
            .from('profiles')
            .update({
                email: sanitizedEmail
            })
            .eq('id', coachId)

        if (profileUpdateError) {
            console.error('Admin change coach email (Profile) error:', profileUpdateError)
            return { success: false, error: `プロフィールのメール更新に失敗しました: ${profileUpdateError.message}` }
        }

        revalidatePath('/admin/coaches')
        revalidatePath(`/admin/coaches/${coachId}`)
        return { success: true, updatedEmail: sanitizedEmail }

    } catch (err: any) {
        console.error('adminChangeCoachEmail exception:', err)
        return { success: false, error: err?.message || '予期せぬエラーが発生しました。' }
    }
}
