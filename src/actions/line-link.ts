'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function unlinkLineUser(studentId: string) {
    const supabase = await createClient()

    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user

    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    // Role Check
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
        return { success: false, error: 'Permission denied' }
    }

    try {
        const { error } = await supabase
            .from('students')
            .update({ line_user_id: null })
            .eq('id', studentId)

        if (error) throw error

        revalidatePath(`/customers/${studentId}`)
        return { success: true }
    } catch (e: any) {
        console.error('Unlink LINE User Error:', e)
        return { success: false, error: 'LINE連携の解除に失敗しました' }
    }
}
