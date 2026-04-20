'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { startOfMonth, subMonths, endOfMonth } from 'date-fns'
import { calculateCoachRate, LessonData } from '@/lib/reward-system'

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

export async function getCurrentCoachRewardRate(coachId: string) {
    const supabaseAdmin = createAdminClient()

    try {
        // 1. Fetch Profile for role and override rank
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role, override_coach_rank')
            .eq('id', coachId)
            .single()

        const isAdmin = profile?.role === 'admin' || profile?.role === 'owner'
        
        if (isAdmin) {
            return { success: true, rate: 1.0, isAdmin: true }
        }

        // 2. Fetch Lessons for rank calculation (past 3 months)
        const referenceDate = new Date()
        const rankStart = startOfMonth(subMonths(referenceDate, 3))
        const rankEnd = endOfMonth(subMonths(referenceDate, 1))

        const { data: lessons } = await supabaseAdmin
            .from('lessons')
            .select('coach_id, lesson_date')
            .eq('coach_id', coachId)
            .gte('lesson_date', rankStart.toISOString())
            .lte('lesson_date', rankEnd.toISOString())

        const rate = calculateCoachRate(
            coachId, 
            (lessons as any) as LessonData[] || [], 
            referenceDate, 
            profile?.override_coach_rank
        )

        return { success: true, rate, isAdmin: false }
    } catch (error: any) {
        console.error('Error getting coach reward rate:', error)
        return { success: false, error: error.message, rate: 0.5, isAdmin: false }
    }
}
