'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
})

export async function login(prevState: any, formData: FormData) {
    const remember = formData.get('remember') === 'true'
    const supabase = await createClient(remember)

    // Validate form data
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const validation = loginSchema.safeParse({ email, password })

    if (!validation.success) {
        return { error: '入力内容が正しくありません' }
    }

    const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        if (error.message === 'Invalid login credentials') {
            return { error: 'メールアドレスまたはパスワードが正しくありません' }
        }
        return { error: error.message }
    }

    if (!user) {
        return { error: 'ログインに失敗しました' }
    }

    // Clear cache specifically for layouts to ensure fresh data
    revalidatePath('/member', 'layout')

    redirect('/member/dashboard')
}
