'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * コーチの稼働可能枠を追加する Server Action
 */
export async function addCoachAvailability(
    coachId: string,
    dayOfWeeks: string[],
    timeOfDay: string,
    area: string,
    notes: string | null
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '認証されていません。' }

    // 管理者か、本人の場合のみ許可（DBポリシー側でも制御）
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const isAdmin = profile?.role === 'admin'
    if (!isAdmin && user.id !== coachId) {
        return { success: false, error: '他のコーチの稼働枠を追加する権限はありません。' }
    }

    const records = dayOfWeeks.map(day => ({
        coach_id: coachId,
        day_of_week: day,
        time_of_day: timeOfDay,
        area: area.trim(),
        notes: notes?.trim() || null
    }))

    try {
        const { error } = await supabase
            .from('coach_availabilities')
            .insert(records)

        if (error) throw error

        revalidatePath(`/admin/coaches/${coachId}`)
        revalidatePath('/coach/profile')
        return { success: true }
    } catch (error: any) {
        console.error('Add Coach Availability Error:', error)
        return { success: false, error: error.message || '追加に失敗しました。' }
    }
}

/**
 * コーチの稼働可能枠を削除する Server Action
 */
export async function deleteCoachAvailability(id: string, coachId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '認証されていません。' }

    try {
        const { error } = await supabase
            .from('coach_availabilities')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath(`/admin/coaches/${coachId}`)
        revalidatePath('/coach/profile')
        return { success: true }
    } catch (error: any) {
        console.error('Delete Coach Availability Error:', error)
        return { success: false, error: error.message || '削除に失敗しました。' }
    }
}

/**
 * コーチの基本エリアを更新する Server Action
 */
export async function updateBaseArea(coachId: string, baseArea: string | null) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '認証されていません。' }

    // 管理者か、本人の場合のみ許可
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const isAdmin = profile?.role === 'admin'
    if (!isAdmin && user.id !== coachId) {
        return { success: false, error: '基本エリアを更新する権限はありません。' }
    }

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ base_area: baseArea?.trim() || null })
            .eq('id', coachId)

        if (error) throw error

        revalidatePath(`/admin/coaches/${coachId}`)
        revalidatePath('/coach/profile')
        return { success: true }
    } catch (error: any) {
        console.error('Update Base Area Error:', error)
        return { success: false, error: error.message || '更新に失敗しました。' }
    }
}
