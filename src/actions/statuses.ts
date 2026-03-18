'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createStudentStatus(data: { id: string, name: string, color_class: string }) {
    const supabase = await createClient()

    // Key format validation (lowercase alphanumeric & underscore)
    if (!/^[a-z0-9_]+$/.test(data.id)) {
        return { success: false, error: 'キーは半角英小文字、数字、アンダースコアのみ使用可能です。' }
    }

    const { error } = await supabase.from('student_statuses').insert({
        id: data.id,
        name: data.name,
        color_class: data.color_class,
        is_system: false,
    })

    if (error) {
        console.error('Failed to create student status:', error)
        return { success: false, error: '追加に失敗しました。キーが重複している可能性があります。' }
    }

    revalidatePath('/admin/masters/statuses')
    revalidatePath('/customers')
    return { success: true }
}

export async function updateStudentStatus(data: { id: string, name: string, color_class: string }) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('student_statuses')
        .update({
            name: data.name,
            color_class: data.color_class,
            updated_at: new Date().toISOString()
        })
        .eq('id', data.id)

    if (error) {
        console.error('Failed to update student status:', error)
        return { success: false, error: '更新に失敗しました' }
    }

    revalidatePath('/admin/masters/statuses')
    revalidatePath('/customers')
    return { success: true }
}

export async function deleteStudentStatus(id: string) {
    const supabase = await createClient()

    // Verify it's not a system status
    const { data: status } = await supabase
        .from('student_statuses')
        .select('is_system')
        .eq('id', id)
        .single()

    if (status?.is_system) {
        return { success: false, error: 'このステータスはシステムで必須のため削除できません。' }
    }

    const { error } = await supabase
        .from('student_statuses')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Failed to delete student status:', error)
        // Check for FK constraint
        if (error.code === '23503') {
            return { success: false, error: 'このステータスを使用している生徒がいるため削除できません。先に該当生徒のステータスを変更してください。' }
        }
        return { success: false, error: '削除に失敗しました。' }
    }

    revalidatePath('/admin/masters/statuses')
    revalidatePath('/customers')
    return { success: true }
}

export async function updateStudentStatusOrder(items: { id: string, display_order: number }[]) {
    const supabase = await createClient()
    try {
        for (const item of items) {
            const { error } = await supabase
                .from('student_statuses')
                .update({ display_order: item.display_order })
                .eq('id', item.id)

            if (error) throw error
        }
        revalidatePath('/admin/masters/statuses')
        revalidatePath('/customers')
        return { success: true }
    } catch (error) {
        console.error('Failed to update status order:', error)
        return { success: false, error: '並び順の更新に失敗しました' }
    }
}
