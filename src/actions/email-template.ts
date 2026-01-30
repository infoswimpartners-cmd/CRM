
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface EmailTemplate {
    id: string
    key: string
    subject: string
    body: string
    variables: string[]
    description: string
    updated_at: string
}

export async function getEmailTemplates() {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('key')

    if (error) throw new Error(error.message)
    return data as EmailTemplate[]
}

export async function updateEmailTemplate(id: string, subject: string, body: string) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('email_templates')
        .update({
            subject,
            body,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/admin/email-templates')
    return { success: true }
}



export async function sendTestEmail(key: string, subject: string, body: string, toEmail: string) {
    const supabase = await createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Default to current user's email if not provided
    const recipient = toEmail || user?.email
    if (!recipient) {
        return { success: false, error: 'Recipient email is required' }
    }

    // 1. Generate Mock Variables based on Key
    const variables = getMockVariables(key)

    // 2. Replace variables in Subject and Body
    let testSubject = subject
    let testBody = body

    for (const [vKey, value] of Object.entries(variables)) {
        // Replace {{key}} case-insensitive
        const regex = new RegExp(`{{${vKey}}}`, 'gi')
        testSubject = testSubject.replace(regex, String(value))
        testBody = testBody.replace(regex, String(value))
    }

    // 3. Send Email using existing functionality (but manual call to EmailService)
    // We can't use existing helper easily because it fetches template from DB. 
    // We want to send *this* specific subject/body.
    // So we'll use the fundamental sending logic. 
    // Since `emailService` is in `src/lib/email.ts` and uses `nodemailer`, let's import it.
    // However, `emailService` exposes `sendEmail`.

    // We rely on import from '@/lib/email'
    const { emailService } = await import('@/lib/email')

    try {
        const result = await emailService.sendEmail({
            to: recipient,
            subject: `[TEST] ${testSubject}`,
            text: testBody
        })
        return { success: result }
    } catch (error: any) {
        console.error('Test Email Failed:', error)
        return { success: false, error: error.message }
    }
}

function getMockVariables(key: string): Record<string, string> {
    const common = {
        name: 'テスト 太郎',
        kana: 'テスト タロウ',
        email: 'test-taro@example.com',
        phone: '090-0000-0000',
    }

    switch (key) {
        case 'inquiry_received':
            return {
                ...common,
                type: 'inquiry',
                message: 'これはテスト送信によるメッセージです。\n本番環境さながらのテストが行えます。',
                all_inputs: '【お名前】: テスト 太郎\n【メール】: test-taro@example.com\n【第一希望】: 2024/01/01 10:00\n【備考】: テストデータです'
            }
        case 'trial_payment_request':
            return {
                ...common,
                trial_date: '2024年1月1日 10:00',
                amount: '6,000',
                payment_link: 'https://example.com/pay/test_link_123'
            }
        case 'enrollment_complete':
            return {
                ...common,
                plan_name: '週1回コース（月4回）',
                start_date: '2024年2月1日'
            }
        case 'lesson_reminder':
            return {
                ...common,
                lesson_date: '明日 10:00',
                location: '東京体育館プール',
                coach_name: '鈴木 コーチ'
            }
        case 'trial_confirmed':
            return {
                ...common,
                trial_date: '2024年1月1日 10:00',
                location: '東京体育館プール'
            }
        case 'trial_payment_completed':
            return {
                ...common,
                full_name: 'テスト 太郎',
                lesson_date: '2024年1月1日 10:00',
                location: 'テスト市民プール'
            }
        default:
            return common
    }
}
