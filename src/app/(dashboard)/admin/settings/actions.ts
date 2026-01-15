'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateConfig(key: string, value: string) {
    const supabase = await createClient()

    // Auth check (Admin only)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return { error: 'Forbidden' }
    }

    const { error } = await supabase
        .from('app_configs')
        .upsert({
            key,
            value,
            updated_at: new Date().toISOString()
        })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/admin/settings')
    return { success: true }
}
