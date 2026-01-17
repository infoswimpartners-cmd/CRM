'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updatePassword(formData: FormData) {
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
        return { error: 'パスワードが一致しません。' }
    }

    if (password.length < 6) {
        return { error: 'パスワードは6文字以上である必要があります。' }
    }

    const supabase = await createClient()

    // 1. Update Supabase Auth Password
    const { error: authError } = await supabase.auth.updateUser({
        password: password
    })

    if (authError) {
        return { error: `パスワード更新エラー: ${authError.message}` }
    }

    // 2. Update Profile flag
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ must_change_password: false })
            .eq('id', user.id)

        if (profileError) {
            console.error('Profile flag update error:', profileError)
            // Continue anyway as password is changed
        }
    }

    // 3. Redirect to home
    redirect('/')
}

export async function resetPassword(formData: FormData) {
    const email = formData.get('email') as string
    const supabase = await createClient()
    const headersList = await import('next/headers').then(mod => mod.headers())
    const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    if (!email) {
        return { error: 'メールアドレスを入力してください。' }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/update-password`,
    })

    if (error) {
        console.error('Reset Password Error:', error)
        return { error: 'メールの送信に失敗しました。時間をおいて再試行してください。' }
    }

    return { success: true }
}
