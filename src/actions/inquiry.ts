'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { emailService } from '@/lib/email'

// Schemas
const createInquirySchema = z.object({
    subject: z.string().min(1, '件名は必須です').max(100, '件名は100文字以内で入力してください'),
    body: z.string().min(10, 'お問い合わせ内容は10文字以上で入力してください').max(2000, 'お問い合わせ内容は2000文字以内で入力してください'),
})

const replyInquirySchema = z.object({
    inquiryId: z.string().uuid(),
    message: z.string().min(1, 'メッセージは必須です').max(2000),
})

export async function createInquiry(formData: FormData) {
    const supabase = await createClient()

    // Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        redirect('/login')
    }

    const rawData = {
        subject: formData.get('subject'),
        body: formData.get('body'),
    }

    const validation = createInquirySchema.safeParse(rawData)
    if (!validation.success) {
        return { success: false, error: validation.error.flatten().fieldErrors }
    }

    const { subject, body } = validation.data

    try {
        // 1. Create Inquiry
        const { data: inquiry, error: inquiryError } = await supabase
            .from('inquiries')
            .insert({
                user_id: user.id,
                subject: subject,
                status: 'open'
            })
            .select()
            .single()

        if (inquiryError) throw inquiryError

        // 2. Create First Message
        const { error: messageError } = await supabase
            .from('inquiry_messages')
            .insert({
                inquiry_id: inquiry.id,
                sender_id: user.id,
                is_admin: false,
                message: body
            })

        if (messageError) throw messageError

        // 3. Send Email Notification to Admin
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        const userName = profile?.full_name || '不明なユーザー'
        const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/inquiries/${inquiry.id}`

        await emailService.sendTemplateEmail(
            'inquiry_received',
            process.env.REPORT_NOTIFICATION_EMAIL || 'admin@example.com',
            {
                subject: subject,
                user_name: userName,
                admin_url: adminUrl
            }
        )

        revalidatePath('/member/contact')
        return { success: true, inquiryId: inquiry.id }

    } catch (error: any) {
        console.error('createInquiry Error:', error)
        return { success: false, error: 'お問い合わせの送信に失敗しました。' }
    }
}

export async function getInquiries() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('getInquiries Error:', error)
        return []
    }
    return data
}

export async function getInquiryDetails(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Fetch Inquiry
    const { data: inquiry, error: inquiryError } = await supabase
        .from('inquiries')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id) // Ensure ownership
        .single()

    if (inquiryError || !inquiry) return null

    // Fetch Messages
    const { data: messages, error: messagesError } = await supabase
        .from('inquiry_messages')
        .select('*')
        .eq('inquiry_id', id)
        .order('created_at', { ascending: true })

    if (messagesError) return null

    return { inquiry, messages }
}

export async function replyInquiry(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const rawData = {
        inquiryId: formData.get('inquiryId'),
        message: formData.get('message'),
    }

    const validation = replyInquirySchema.safeParse(rawData)
    if (!validation.success) return { success: false, error: 'Invalid input' }

    const { inquiryId, message } = validation.data

    try {
        // Verify Ownership
        const { data: inquiry } = await supabase
            .from('inquiries')
            .select('id')
            .eq('id', inquiryId)
            .eq('user_id', user.id)
            .single()

        if (!inquiry) return { success: false, error: 'Inquiry not found' }

        // Insert Message
        const { error } = await supabase
            .from('inquiry_messages')
            .insert({
                inquiry_id: inquiryId,
                sender_id: user.id,
                is_admin: false,
                message: message
            })

        if (error) throw error

        // Update inquiry updated_at (trigger handles it, but good to know)
        // Also maybe change status if it was closed?
        // For now, keep as is.

        revalidatePath(`/member/contact/${inquiryId}`)
        return { success: true }

    } catch (error: any) {
        console.error('replyInquiry Error:', error)
        return { success: false, error: '送信に失敗しました' }
    }
}
