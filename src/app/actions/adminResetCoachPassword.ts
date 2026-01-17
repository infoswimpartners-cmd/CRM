'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function adminResetCoachPassword(coachId: string, newPassword: string) {
    const supabase = await createClient()

    // 1. Verify Caller is Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return { success: false, error: '権限がありません' }
    }

    // 2. Update Password using Admin Client
    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
        coachId,
        { password: newPassword }
    )

    if (error) {
        console.error('Admin password reset error:', error)
        return { success: false, error: `パスワード変更に失敗しました: ${error.message}` }
    }

    // 3. Optional: Set "must_change_password" flag if you want them to change it again
    // For now, we assume this is a definitive reset.

    revalidatePath('/admin/coaches')
    return { success: true }
}
