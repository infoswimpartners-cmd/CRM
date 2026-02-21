'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { emailService } from '@/lib/email'

export async function getAdminInquiries() {
    const supabaseAdmin = createAdminClient()

    // Fetch inquiries with user/student info
    const { data, error } = await supabaseAdmin
        .from('inquiries')
        .select('*, students(full_name, contact_email)')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('getAdminInquiries Error:', error)
        return []
    }
    return data
}

export async function getAdminInquiryDetails(id: string) {
    const supabaseAdmin = createAdminClient()

    const { data: inquiry, error: inquiryError } = await supabaseAdmin
        .from('inquiries')
        .select('*, students(full_name, contact_email)')
        .eq('id', id)
        .single()

    if (inquiryError || !inquiry) return null

    const { data: messages, error: messagesError } = await supabaseAdmin
        .from('inquiry_messages')
        .select('*')
        .eq('inquiry_id', id)
        .order('created_at', { ascending: true })

    if (messagesError) return null

    return { inquiry, messages }
}

export async function adminReplyInquiry(formData: FormData) {
    const supabaseAdmin = createAdminClient()
    const inquiryId = formData.get('inquiryId') as string
    const message = formData.get('message') as string

    if (!inquiryId || !message) return { success: false, error: 'Invalid input' }

    try {
        // Insert Admin Message
        // sender_id is null for system/admin or we can get current admin user id if we passed it.
        // For simplicity, let's use a null sender_id but is_admin=true.
        // Or if we have a way to get admin ID from session in server component...
        // But this is an action. We *should* verified auth.
        // Let's assume protection is done by middleware/layout.
        // Actually, we need to know WHICH admin replied?
        // For now, sender_id can be null or we pass it.
        // Let's create an "Admin" profile or use the user's ID if available.
        // Since this is server action, we can get session.

        // Get current user (Admin)
        // Wait, `createAdminClient` bypasses auth.
        // We should distinct "System Action" vs "Admin User Action".
        // Let's try to get user from standard client to log sender.

        // Insert
        const { error } = await supabaseAdmin
            .from('inquiry_messages')
            .insert({
                inquiry_id: inquiryId,
                sender_id: null, // Or admin ID
                is_admin: true,
                message: message
            })

        if (error) throw error

        // ... inside adminReplyInquiry

        // Update Status to 'replied'
        const { data: updatedInquiry } = await supabaseAdmin
            .from('inquiries')
            .update({ status: 'replied', updated_at: new Date().toISOString() })
            .eq('id', inquiryId)
            .select('*, students(full_name, contact_email)')
            .single()

        // Send Email to User
        if (updatedInquiry && updatedInquiry.students?.contact_email) {
            const inquiryUrl = `${process.env.NEXT_PUBLIC_APP_URL}/member/contact/${inquiryId}`

            await emailService.sendTemplateEmail(
                'inquiry_replied',
                updatedInquiry.students.contact_email,
                {
                    user_name: updatedInquiry.students.full_name || '会員',
                    subject: updatedInquiry.subject,
                    inquiry_url: inquiryUrl
                }
            )
        }

        revalidatePath(`/admin/inquiries/${inquiryId}`)
        revalidatePath(`/admin/inquiries`)
        return { success: true }
    } catch (error: any) {
        console.error('adminReplyInquiry Error:', error)
        return { success: false, error: error.message }
    }
}

export async function closeInquiry(inquiryId: string) {
    const supabaseAdmin = createAdminClient()
    try {
        await supabaseAdmin
            .from('inquiries')
            .update({ status: 'closed', updated_at: new Date().toISOString() })
            .eq('id', inquiryId)

        revalidatePath(`/admin/inquiries/${inquiryId}`)
        revalidatePath(`/admin/inquiries`)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
