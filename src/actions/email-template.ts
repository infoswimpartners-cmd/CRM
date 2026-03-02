
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
    is_approval_required?: boolean
    is_auto_send_enabled?: boolean
    sort_order?: number
}

export interface EmailTrigger {
    id: string
    name: string
    description: string
    template_id: string | null
    is_enabled: boolean
    google_chat_webhook_url?: string | null
    google_chat_enabled?: boolean
    google_chat_message_template?: string | null
}

export async function getEmailTemplates() {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('sort_order', { ascending: true })

    if (error) throw new Error(error.message)
    return data as EmailTemplate[]
}

export async function updateEmailTemplate(
    id: string,
    subject: string,
    body: string,
    is_approval_required?: boolean,
    is_auto_send_enabled?: boolean
) {
    const supabase = createAdminClient()

    const updateData: any = {
        subject,
        body,
        updated_at: new Date().toISOString()
    }

    if (is_approval_required !== undefined) {
        updateData.is_approval_required = is_approval_required
    }
    if (is_auto_send_enabled !== undefined) {
        updateData.is_auto_send_enabled = is_auto_send_enabled
    }

    const { error } = await supabase
        .from('email_templates')
        .update(updateData)
        .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/admin/email-templates')
    return { success: true }
}

export async function addEmailTemplate(data: {
    key: string
    subject: string
    body: string
    description: string
}) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('email_templates')
        .insert({
            key: data.key,
            subject: data.subject,
            body: data.body,
            description: data.description,
            variables: [],
            is_auto_send_enabled: true,
            is_approval_required: false,
            sort_order: 999
        })

    if (error) throw new Error(error.message)

    revalidatePath('/admin/email-templates')
    return { success: true }
}

export async function deleteEmailTemplate(id: string) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/admin/email-templates')
    return { success: true }
}

export async function reorderEmailTemplates(updates: { id: string; sort_order: number }[]) {
    const supabase = createAdminClient()

    // update multiple rows in one go would require a database function or individual updates.
    // Given the admin interface and small number of templates, Promise.all is acceptable.
    const promises = updates.map(update =>
        supabase
            .from('email_templates')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id)
    )

    await Promise.all(promises)

    revalidatePath('/admin/email-templates')
    return { success: true }
}

export async function getEmailTriggers() {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('email_triggers')
        .select('*')
        .order('id')

    if (error) throw new Error(error.message)
    return data as EmailTrigger[]
}

/**
 * テンプレートキーに紐づく、Google Chat が有効なトリガーの名前リストを返す。
 * テスト送信ダイアログがダイアログ表示時に呼び出す。
 */
export async function getTestChatChannels(templateKey: string): Promise<string[]> {
    const supabase = createAdminClient()

    // 1. テンプレートキー → テンプレートID
    const { data: tmpl, error: tmplErr } = await supabase
        .from('email_templates')
        .select('id')
        .eq('key', templateKey)
        .single()

    if (tmplErr) console.error('[getTestChatChannels] template lookup error:', tmplErr)
    if (!tmpl?.id) return []

    // 2. このテンプレートに紐づく全トリガーを取得（JS側でフィルタリング）
    const { data: allTriggers, error: triggerErr } = await supabase
        .from('email_triggers')
        .select('name, google_chat_webhook_url, google_chat_enabled')
        .eq('template_id', tmpl.id)

    if (triggerErr) console.error('[getTestChatChannels] trigger lookup error:', triggerErr)
    if (!allTriggers) return []

    // google_chat_enabled が真値 かつ webhook URL が存在するものを返す
    return allTriggers
        .filter((t: any) => t.google_chat_enabled && t.google_chat_webhook_url)
        .map((t: any) => t.name as string)
}

export async function updateEmailTrigger(
    id: string,
    template_id: string | null,
    is_enabled: boolean,
    google_chat_webhook_url?: string | null,
    google_chat_enabled?: boolean,
    google_chat_message_template?: string | null
) {
    const supabase = createAdminClient()
    const updateData: any = { template_id, is_enabled, updated_at: new Date().toISOString() }
    if (google_chat_webhook_url !== undefined) updateData.google_chat_webhook_url = google_chat_webhook_url
    if (google_chat_enabled !== undefined) updateData.google_chat_enabled = google_chat_enabled
    if (google_chat_message_template !== undefined) updateData.google_chat_message_template = google_chat_message_template

    const { error } = await supabase
        .from('email_triggers')
        .update(updateData)
        .eq('id', id)

    if (error) throw new Error(error.message)
    revalidatePath('/admin/email-templates')
    return { success: true }
}

export async function sendTestEmail(key: string, subject: string, body: string, toEmail: string) {
    const supabase = await createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()

    const recipient = toEmail || user?.email || ''

    // 1. ダミー変数を生成
    const variables = getMockVariables(key)

    // 2. 件名・本文に変数を埋め込む
    let testSubject = subject
    let testBody = body
    for (const [vKey, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${vKey}}}`, 'gi')
        testSubject = testSubject.replace(regex, String(value))
        testBody = testBody.replace(regex, String(value))
    }

    const { emailService } = await import('@/lib/email')
    const results: string[] = []

    // 3-a. Google Chat 送信（先にChat設定を確認）
    // テスト送信では google_chat_enabled に関わらず、Webhook URLが設定されていれば送信する
    let hasChatChannels = false
    try {
        let chatTriggers: any[] = []

        // まずテンプレートキーからIDを引いてトリガーを検索
        const { data: tmpl } = await supabase
            .from('email_templates')
            .select('id')
            .eq('key', key)
            .single()

        if (tmpl?.id) {
            const { data: allTriggers } = await supabase
                .from('email_triggers')
                .select('id, name, google_chat_webhook_url, google_chat_enabled, google_chat_message_template')
                .eq('template_id', tmpl.id)

            // Webhook URLが設定されているトリガーをすべて対象（enabledフラグは問わない）
            chatTriggers = (allTriggers || []).filter(
                (t: any) => t.google_chat_webhook_url && t.google_chat_webhook_url.trim() !== ''
            )
            console.log(`[sendTestEmail] template found: ${tmpl.id}, triggers with URL: ${chatTriggers.length}`)
        } else {
            console.log(`[sendTestEmail] template key '${key}' not found in email_templates`)
        }

        if (chatTriggers.length > 0) {
            hasChatChannels = true
            const { sendGoogleChatMessage, replaceVariables } = await import('@/lib/google-chat')
            for (const trigger of chatTriggers) {
                try {
                    const msgTemplate = trigger.google_chat_message_template
                        ? replaceVariables(trigger.google_chat_message_template, { ...variables, to: recipient })
                        : `🧪 *[TEST] ${testSubject}*\n\n${testBody}`
                    await sendGoogleChatMessage(trigger.google_chat_webhook_url, msgTemplate)
                    results.push(`Google Chat (${trigger.name})`)
                    console.log(`[sendTestEmail] sent to Google Chat: ${trigger.name}`)
                } catch (chatErr) {
                    console.error('[Test] Google Chat send error:', chatErr)
                }
            }
        }
    } catch (chatErr) {
        console.error('[Test] Google Chat lookup error:', chatErr)
    }


    // 3-b. メール送信（宛先がある場合のみ）
    if (recipient) {
        try {
            const ok = await emailService.sendEmail({
                to: recipient,
                subject: `[TEST] ${testSubject}`,
                text: testBody
            })
            if (ok) results.push('メール')
        } catch (error: any) {
            console.error('Test Email Failed:', error)
            // Chatは成功していてもメールが失敗した場合はエラーを返す
            if (!hasChatChannels) {
                return { success: false, error: error.message }
            }
        }
    } else if (!hasChatChannels) {
        // メールアドレスもChatも設定がない場合
        return { success: false, error: '送信先がありません。メールアドレスを入力するか、Google Chat Webhookを設定してください。' }
    }

    return {
        success: true,
        sentTo: results
    }
}

function getMockVariables(key: string): Record<string, string> {
    const common = {
        name: 'テスト 太郎',
        kana: 'テスト タロウ',
        email: 'test-taro@example.com',
        phone: '090-0000-0000',
        to: 'test-taro@example.com',
    }

    switch (key) {
        case 'inquiry_received':
            return {
                ...common,
                type: 'inquiry',
                message: 'これはテスト送信によるメッセージです。\n本番環境さながらのテストが行えます。',
                all_inputs: '【お名前】: テスト 太郎\n【メール】: test-taro@example.com\n【第一希望】: 2024/01/01 10:00\n【備考】: テストデータです'
            }
        case 'reception_completed':
            return {
                ...common,
                station: '渋谷駅',
                '第一希望': '2024年1月10日 10:00',
                '第二希望': '2024年1月12日 13:00',
                '第三希望': '2024年1月15日 15:00',
                goal: 'クロールで25m泳げるようになりたい',
                frequency: '週1回',
                second_name: '',
                other: '特になし',
                all_inputs: '【お名前】: テスト 太郎\n【最寄り駅】: 渋谷駅\n【第一希望】: 2024年1月10日 10:00\n【その他】: 特になし'
            }
        case 'trial_form_submitted_admin':
            return {
                ...common,
                station: '渋谷駅',
                '第一希望': '2024年1月10日 10:00',
                '第二希望': '2024年1月12日 13:00',
                '第三希望': '2024年1月15日 15:00',
                goal: 'クロールで25m泳げるようになりたい',
                frequency: '週1回',
                second_name: '',
                type_label: '体験申し込み',
                all_inputs: '【お名前】: テスト 太郎\n【最寄り駅】: 渋谷駅\n【第一希望】: 2024年1月10日 10:00\n【泳力・目標】: クロールで25m泳げるようになりたい'
            }

        case 'trial_payment_request':
            return {
                ...common,
                trial_date: '2024年1月1日 10:00',
                amount: '6,000',
                payment_link: 'https://example.com/pay/test_link_123'
            }
        case 'enrollment_complete':
        case 'enrollment_completed':
            return {
                ...common,
                plan_name: '週1回コース（月4回）',
                start_date: '2024年2月1日'
            }
        case 'lesson_reminder':
        case 'trial_reminder':
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
        case 'lesson_report_sent':
        case 'notice_lesson_report':
            return {
                ...common,
                coach_name: '鈴木 コーチ',
                student_name: 'テスト 太郎',
                lesson_date: '2024年3月2日（日）10:00',
                location: '東京体育館プール',
                lesson_type: '個人レッスン',
                price: '5,000円',
                description: 'クロールのフォーム改善に取り組みました。息継ぎのタイミングが安定してきました。'
            }
        case 'payment_success':
            return {
                ...common,
                student_name: 'テスト 太郎',
                lesson_date: '2024年3月1日',
                amount: '10,000',
                payment_link: 'https://example.com/pay/test_link_123',
                payment_url: 'https://example.com/pay/test_link_123'
            }
        case 'payment_failed':
            return {
                ...common,
                amount: '10,000',
                card_update_url: 'https://example.com/card-update'
            }
        case 'lesson_cancelled':
            return {
                ...common,
                lesson_date: '2024年3月5日 10:00',
                location: '東京体育館プール',
                coach_name: '鈴木 コーチ'
            }
        default:
            return {
                ...common,
                full_name: 'テスト 太郎',
                lesson_date: '2024年1月1日 10:00',
                location: 'テストプール',
                coach_name: '鈴木 コーチ',
                student_name: 'テスト 太郎',
                amount: '5,000',
                plan_name: 'テストプラン',
            }
    }
}

