'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ChatWebhook = {
    id: string
    space_name: string
    webhook_url: string
    active: boolean
    created_at: string
}

/**
 * 管理者権限を検証する内部ヘルパー
 */
async function verifyAdminRole() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { isAuthorized: false, user: null }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    return {
        isAuthorized: profile?.role === 'admin',
        user
    }
}

/**
 * すべてのGoogle Chat Webhookマスタを取得します（一般ユーザー/コーチもお知らせ公開連携用に参照可能）
 */
export async function getChatWebhooksAction() {
    const supabase = await createClient()
    
    // ログイン済みユーザーであることのみ検証（RLSでも制御）
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Unauthorized', data: [] }
    }

    try {
        const { data, error } = await supabase
            .from('google_chat_webhooks')
            .select('*')
            .order('space_name', { ascending: true })

        if (error) throw error
        return { success: true, data: data as ChatWebhook[] }
    } catch (error: any) {
        console.error('getChatWebhooksAction Error:', error)
        return { success: false, error: error.message || 'Failed to fetch webhooks', data: [] }
    }
}

/**
 * Webhookマスタを新規作成します（管理者のみ）
 */
export async function createChatWebhookAction(data: { space_name: string; webhook_url: string }) {
    const { isAuthorized } = await verifyAdminRole()
    if (!isAuthorized) {
        return { success: false, error: 'Forbidden: Admin only' }
    }

    const supabase = await createClient()
    try {
        const { error } = await supabase
            .from('google_chat_webhooks')
            .insert({
                space_name: data.space_name,
                webhook_url: data.webhook_url,
                active: true
            })

        if (error) throw error

        revalidatePath('/admin/webhooks')
        revalidatePath('/admin/announcements')
        revalidatePath('/admin/coaches')
        return { success: true }
    } catch (error: any) {
        console.error('createChatWebhookAction Error:', error)
        return { success: false, error: error.message || 'Failed to create webhook' }
    }
}

/**
 * Webhookマスタを更新します（管理者のみ）
 */
export async function updateChatWebhookAction(data: { id: string; space_name: string; webhook_url: string; active: boolean }) {
    const { isAuthorized } = await verifyAdminRole()
    if (!isAuthorized) {
        return { success: false, error: 'Forbidden: Admin only' }
    }

    const supabase = await createClient()
    try {
        const { error } = await supabase
            .from('google_chat_webhooks')
            .update({
                space_name: data.space_name,
                webhook_url: data.webhook_url,
                active: data.active
            })
            .eq('id', data.id)

        if (error) throw error

        revalidatePath('/admin/webhooks')
        revalidatePath('/admin/announcements')
        revalidatePath('/admin/coaches')
        return { success: true }
    } catch (error: any) {
        console.error('updateChatWebhookAction Error:', error)
        return { success: false, error: error.message || 'Failed to update webhook' }
    }
}

/**
 * Webhookマスタを削除します（管理者のみ）
 */
export async function deleteChatWebhookAction(id: string) {
    const { isAuthorized } = await verifyAdminRole()
    if (!isAuthorized) {
        return { success: false, error: 'Forbidden: Admin only' }
    }

    const supabase = await createClient()
    try {
        const { error } = await supabase
            .from('google_chat_webhooks')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/admin/webhooks')
        revalidatePath('/admin/announcements')
        revalidatePath('/admin/coaches')
        return { success: true }
    } catch (error: any) {
        console.error('deleteChatWebhookAction Error:', error)
        return { success: false, error: error.message || 'Failed to delete webhook' }
    }
}
