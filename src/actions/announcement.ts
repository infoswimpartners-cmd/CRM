'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type CreateAnnouncementInput = {
    title: string
    content: string
    priority: 'normal' | 'high'
    notifyGChat: boolean
    gchatWebhookId?: string | null
}

export async function createAnnouncementAction(data: CreateAnnouncementInput) {
    const supabase = await createClient()

    // 1. Verify Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return { success: false, error: 'Forbidden: Admin only' }
    }

    // 2. Insert Announcement
    const { data: announcement, error: insertError } = await supabase
        .from('announcements')
        .insert({
            title: data.title,
            content: data.content,
            priority: data.priority,
            created_by: user.id,
            published_at: new Date().toISOString(),
            notify_email: false,
            notify_gchat: data.notifyGChat,
            gchat_webhook_id: data.gchatWebhookId || null,
        })
        .select()
        .single()

    if (insertError) {
        console.error('Error inserting announcement:', insertError)
        return { success: false, error: 'Failed to create announcement' }
    }

    // Revalidate paths immediately after insertion
    revalidatePath('/admin/announcements')
    revalidatePath('/coach') // For the widget

    // 4. Send Google Chat Notification (If checkmarked)
    if (data.notifyGChat && data.gchatWebhookId) {
        try {
            const { sendGoogleChatNotification } = await import('@/lib/gchat')
            
            // Get Webhook URL from DB
            const { data: webhook, error: webhookError } = await supabase
                .from('google_chat_webhooks')
                .select('webhook_url')
                .eq('id', data.gchatWebhookId)
                .single()

            if (!webhookError && webhook?.webhook_url) {
                await sendGoogleChatNotification({
                    webhookUrl: webhook.webhook_url,
                    title: data.title,
                    content: data.content
                })
            } else {
                console.error('[GoogleChat] Webhook URL not found for ID:', data.gchatWebhookId, webhookError)
            }
        } catch (e) {
            console.error('Google Chat notification failed:', e)
        }
    }

    return { success: true, announcement }
}

export type UpdateAnnouncementInput = {
    id: string
    title: string
    content: string
    priority: 'normal' | 'high'
}

export async function updateAnnouncementAction(data: UpdateAnnouncementInput) {
    const supabase = await createClient()

    // 1. Verify Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return { success: false, error: 'Forbidden: Admin only' }
    }

    // 2. Update Announcement
    const { data: announcement, error: updateError } = await supabase
        .from('announcements')
        .update({
            title: data.title,
            content: data.content,
            priority: data.priority,
            // updated_at は DB にあれば更新される
        })
        .eq('id', data.id)
        .select()
        .single()

    if (updateError) {
        console.error('Error updating announcement:', updateError)
        return { success: false, error: 'Failed to update announcement' }
    }

    revalidatePath('/admin/announcements')
    revalidatePath('/coach')
    return { success: true, announcement }
}

export async function deleteAnnouncementAction(id: string) {
    const supabase = await createClient()

    // 1. Verify Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return { success: false, error: 'Forbidden: Admin only' }
    }

    // 2. Delete Announcement
    const { error: deleteError } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)

    if (deleteError) {
        console.error('Error deleting announcement:', deleteError)
        return { success: false, error: 'Failed to delete announcement' }
    }

    revalidatePath('/admin/announcements')
    revalidatePath('/coach')
    return { success: true }
}
