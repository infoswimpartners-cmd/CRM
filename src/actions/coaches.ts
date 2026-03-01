'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateCoachRewardAction(coachId: string, distantRewardFee: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Ensure the user is an admin
    const { data: adminCheck } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (adminCheck?.role !== 'admin') {
        return { success: false, error: 'Unauthorized: Admins only' }
    }

    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                distant_reward_fee: distantRewardFee
            })
            .eq('id', coachId)

        if (error) throw error

        revalidatePath(`/admin/coaches/${coachId}`)
        return { success: true }
    } catch (error: any) {
        console.error('Update Coach Reward Error:', error)
        return { success: false, error: error.message || 'Failed to update coach reward' }
    }
}
