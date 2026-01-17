'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createStudent(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: '認証エラーが発生しました。再度ログインしてください。' }
    }

    const full_name = formData.get('full_name') as string
    const grade = formData.get('grade') as string
    const sex = formData.get('sex') as string
    const contact_email = formData.get('contact_email') as string
    const memo = formData.get('memo') as string

    if (!full_name) {
        return { error: '生徒名は必須です。' }
    }

    try {
        const { error } = await supabase
            .from('students')
            .insert({
                full_name,
                grade,
                sex,
                contact_email,
                memo,
                // created_by: user.id // If needed depending on schema
            })

        if (error) throw error

    } catch (error: any) {
        console.error('Create Student Error:', error)
        return { error: '生徒の登録に失敗しました。' }
    }

    revalidatePath('/students')
    redirect('/students')
}
