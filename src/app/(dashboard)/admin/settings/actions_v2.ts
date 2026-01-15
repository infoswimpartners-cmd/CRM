'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateEmailTemplate(subject: string, body: string) {
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

    // Update Subject
    const { error: subjectError } = await supabase
        .from('app_configs')
        .upsert({
            key: 'reminder_email_subject',
            value: subject,
            updated_at: new Date().toISOString()
        })

    if (subjectError) return { error: subjectError.message }

    // Update Body
    const { error: bodyError } = await supabase
        .from('app_configs')
        .upsert({
            key: 'reminder_email_template',
            value: body,
            updated_at: new Date().toISOString()
        })

    if (bodyError) return { error: bodyError.message }

    revalidatePath('/admin/settings')
    return { success: true }
}

export async function sendTestEmail(subjectTemplate: string, bodyTemplate: string) {
    const supabase = await createClient()

    // Auth check (Admin only)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return { error: 'Forbidden' }
    }

    // Dummy Data
    const dummyData = {
        student_name: 'テスト生徒',
        date: '1月1日(月)',
        time: '10:00',
        coach_name: 'テストコーチ'
    }

    // Replace variables
    let subject = subjectTemplate
    let body = bodyTemplate

    Object.entries(dummyData).forEach(([key, value]) => {
        subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), value)
        body = body.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })

    // Send Email
    // Note: Importing emailService here. Since this is a server file, it should be fine.
    // However, emailService is in @/lib/email. We need to import it.
    const { emailService } = await import('@/lib/email')

    const sent = await emailService.sendEmail({
        to: user.email || '', // Send to the admin executing the test
        subject: `[TEST] ${subject}`,
        text: body
    })

    if (!sent) return { error: 'Failed to send email' }

    return { success: true, email: user.email }
}
