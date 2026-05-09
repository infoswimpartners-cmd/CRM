'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function disconnectGoogleCalendar() {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    const { error } = await supabase
        .from('profiles')
        .update({ google_refresh_token: null })
        .eq('id', user.id)

    if (error) {
        console.error('[disconnectGoogleCalendar] Error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/settings')
    revalidatePath('/admin/settings')
    return { success: true }
}
