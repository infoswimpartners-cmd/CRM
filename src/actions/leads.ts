'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendGoogleChatMessage } from '@/lib/google-chat'
import { emailService } from '@/lib/email'

// 年齢を計算するヘルパー関数
function calculateAge(birthDateString: string | null | undefined): number | null {
    if (!birthDateString) return null
    const birthDate = new Date(birthDateString)
    if (isNaN(birthDate.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--
    }
    return age
}

// 1. Google Chatへ案件情報を通知し、リードを募集開始ステータスにする
export async function sendLeadNotificationAction(
    leadId: string,
    location: string,
    webhookId: string
) {
    const supabase = await createClient()

    try {
        // リード情報の取得
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single()

        if (leadError || !lead) {
            throw new Error('リードが見つかりません')
        }

        // Webhook URLの取得
        const { data: webhook, error: webhookError } = await supabase
            .from('google_chat_webhooks')
            .select('webhook_url, space_name')
            .eq('id', webhookId)
            .single()

        if (webhookError || !webhook) {
            throw new Error('通知先スペース（Webhook）が見つかりません')
        }

        // リードの場所を設定し、ステータスを「募集開始」に更新
        const { error: updateError } = await supabase
            .from('leads')
            .update({
                lesson_location: location,
                status: '募集開始',
                notification_webhook_id: webhookId
            })
            .eq('id', leadId)

        if (updateError) {
            throw updateError
        }

        // app_configs から lead_notification_template を取得
        const { data: configData } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', 'lead_notification_template')
            .single()

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const assignUrl = `${siteUrl}/coach/leads`

        const defaultTemplate = `📢 *【新規レッスン案件のお知らせ】*
コーチの皆様、新規のレッスン案件が登録されました。
担当をご希望の方は、案件紹介ページよりアサインを行ってください。

*■ 案件詳細*
名前： {{name}}
性別： {{gender}}
年齢： {{age}}
レベル・目標： {{skill_level}}
希望エリア/最寄駅： {{area}}
希望頻度： {{frequency}}
可能な曜日・時間帯： {{available_times}}
その他： {{notes}}

希望日時：
① {{datetime1}}
② {{datetime2}}
③ {{datetime3}}
{{second_student_info}}

▼ 案件確認・アサインはこちら
{{assign_url}}`

        const age = calculateAge(lead.birth_date)
        const ageStr = age !== null ? `${age}歳` : '未設定'

        let secondStudentInfo = ''
        if (lead.second_student_name) {
            const secondAge = calculateAge(lead.second_student_birth_date)
            const secondAgeStr = secondAge !== null ? `${secondAge}歳` : '未設定'
            secondStudentInfo = `\n\n【2人目の情報】\n名前： ${lead.second_student_name}\n性別： ${lead.second_student_gender || '未設定'}\n年齢： ${secondAgeStr}`
        }

        const template = configData?.value || defaultTemplate

        const message = template
            .replace(/\{\{area\}\}/g, lead.area || '未設定')
            .replace(/\{\{location\}\}/g, location)
            .replace(/\{\{datetime1\}\}/g, lead.datetime1 || '未設定')
            .replace(/\{\{datetime2\}\}/g, lead.datetime2 || '未設定')
            .replace(/\{\{datetime3\}\}/g, lead.datetime3 || '未設定')
            .replace(/\{\{skill_level\}\}/g, lead.skill_level || lead.concern || '未設定')
            .replace(/\{\{frequency\}\}/g, lead.frequency || '未設定')
            .replace(/\{\{notes\}\}/g, lead.notes || 'なし')
            .replace(/\{\{assign_url\}\}/g, assignUrl)
            .replace(/\{\{name\}\}/g, lead.name || '未設定')
            .replace(/\{\{gender\}\}/g, lead.gender || '未設定')
            .replace(/\{\{age\}\}/g, ageStr)
            .replace(/\{\{second_student_info\}\}/g, secondStudentInfo)
            .replace(/\{\{available_times\}\}/g, lead.available_times || '未設定')

        // メッセージ送信
        const sent = await sendGoogleChatMessage(webhook.webhook_url, message, `lead_${leadId}`)
        if (!sent) {
            throw new Error('Google Chatへの通知送信に失敗しました')
        }

        revalidatePath('/admin/leads')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to send lead notification:', error)
        return { success: false, error: error.message || '通知送信に失敗しました' }
    }
}

// 2. コーチをアサインし、自動顧客連絡を送信する
export async function assignLeadAction(leadId: string, confirmedDate: string, confirmedLocation: string) {
    const supabase = await createClient()

    try {
        // 1. ログインコーチ情報の取得
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            throw new Error('認証エラー: ログインしてください')
        }

        // コーチのプロフィールを取得
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, line_friend_url')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            throw new Error('コーチのプロフィールが見つかりません')
        }

        // 2. リードの競合アサインチェック
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single()

        if (leadError || !lead) {
            throw new Error('案件が見つかりません')
        }

        if (lead.assigned_coach_id) {
            throw new Error('この案件はすでに他のコーチがアサイン済みです')
        }

        // 3. リードレコードをアサイン完了状態に更新
        const { error: updateError } = await supabase
            .from('leads')
            .update({
                assigned_coach_id: profile.id,
                status: '体験確定',
                assigned_at: new Date().toISOString(),
                confirmed_datetime: confirmedDate,
                confirmed_location: confirmedLocation
            })
            .eq('id', leadId)

        if (updateError) {
            throw updateError
        }

        // 3.5. 顧客マスタ（students）および紐付けテーブル（student_coaches）へのアサインコーチ紐付け
        let studentId: string | null = null

        // LINE ID での生徒検索
        if (lead.line_user_id) {
            const { data: stdByLine } = await supabase
                .from('students')
                .select('id')
                .eq('line_user_id', lead.line_user_id)
                .maybeSingle()
            if (stdByLine) {
                studentId = stdByLine.id
            }
        }

        // メールアドレスでの生徒検索
        if (!studentId && lead.email) {
            const { data: stdByEmail } = await supabase
                .from('students')
                .select('id')
                .eq('contact_email', lead.email)
                .maybeSingle()
            if (stdByEmail) {
                studentId = stdByEmail.id
            }
        }

        // お名前での生徒検索
        if (!studentId && lead.name) {
            const { data: stdByName } = await supabase
                .from('students')
                .select('id')
                .eq('full_name', lead.name)
                .maybeSingle()
            if (stdByName) {
                studentId = stdByName.id
            }
        }

        if (studentId) {
            // students テーブルの coach_id と status を更新
            const { error: studentUpdateError } = await supabase
                .from('students')
                .update({
                    coach_id: profile.id,
                    status: 'trial_confirmed'
                })
                .eq('id', studentId)

            if (studentUpdateError) {
                console.error('Failed to update student coach_id and status:', studentUpdateError)
            }

            // student_coaches テーブルの重複チェックとインサート
            const { data: existRel } = await supabase
                .from('student_coaches')
                .select('id')
                .eq('student_id', studentId)
                .eq('coach_id', profile.id)
                .maybeSingle()

            if (!existRel) {
                const { error: relInsertError } = await supabase
                    .from('student_coaches')
                    .insert({
                        student_id: studentId,
                        coach_id: profile.id,
                        role: 'main'
                    })
                
                if (relInsertError) {
                    console.error('Failed to insert student_coaches relation:', relInsertError)
                }
            }

            // 関連画面のキャッシュ再検証
            revalidatePath(`/customers/${studentId}`)
        }

        // 4. 顧客への自動確定通知（LINEプッシュメッセージ）の送信
        if (lead.line_user_id && lead.send_customer_notification !== false) {
            // app_configs から設定を取得
            const { data: tokenConfig } = await supabase
                .from('app_configs')
                .select('value')
                .eq('key', 'line_channel_access_token')
                .single()

            const { data: templateConfig } = await supabase
                .from('app_configs')
                .select('value')
                .eq('key', 'line_assigned_template')
                .single()

            const token = tokenConfig?.value || ''
            
            const defaultLineAssignedTemplate = `{{name}} 様

お申し込みいただいた体験レッスンの担当コーチが決定いたしました。

■ 担当コーチ: {{coach_name}}
■ 確定体験日時: {{lesson_date}}
■ レッスン場所: {{location}}
{{second_student_info}}

別途、担当コーチよりレッスンの日時調整等のご連絡をさせていただきます。
ご連絡をお待ちいただけますようお願いいたします。

Swim Partners`

            const bodyTemplate = templateConfig?.value || defaultLineAssignedTemplate

            // 2人目の情報の組み立て
            let secondStudentInfo = ''
            if (lead.second_student_name) {
                const secondAge = calculateAge(lead.second_student_birth_date)
                const secondAgeStr = secondAge !== null ? `${secondAge}歳` : '未設定'
                secondStudentInfo = `\n■ 2人目の情報\n名前: ${lead.second_student_name}（${lead.second_student_gender || '未設定'} / ${secondAgeStr}）`
            }

            const message = bodyTemplate
                .replace(/\{\{name\}\}/g, lead.name || 'お客様')
                .replace(/\{\{coach_name\}\}/g, profile.full_name || '')
                .replace(/\{\{coach_line_url\}\}/g, profile.line_friend_url || '')
                .replace(/\{\{lesson_date\}\}/g, confirmedDate)
                .replace(/\{\{location\}\}/g, confirmedLocation)
                .replace(/\{\{second_student_info\}\}/g, secondStudentInfo)

            const { lineService } = await import('@/lib/line')
            const success = await lineService.pushMessage(lead.line_user_id, message, token)
            if (!success) {
                console.error('Failed to send LINE push notification to client')
            }
        }

        // 5. アサイン確定の Google Chat 通知を、通知元スペースに送信（スレッド返信）
        if (lead.notification_webhook_id) {
            try {
                const { data: webhook } = await supabase
                    .from('google_chat_webhooks')
                    .select('webhook_url')
                    .eq('id', lead.notification_webhook_id)
                    .single()
                
                if (webhook?.webhook_url) {
                    const { data: templateConfig } = await supabase
                        .from('app_configs')
                        .select('value')
                        .eq('key', 'lead_assigned_notification_template')
                        .maybeSingle()

                    const defaultTemplate = `✅ *【体験レッスンアサイン確定】*
案件のアサインが確定いたしました。

*■ アサインコーチ*
・名前： {{coach_name}}
・確定体験日時： {{confirmed_datetime}}
・確定体験場所： {{confirmed_location}}

*■ 確定顧客*
・名前： {{name}} 様{{second_student_info}}`

                    const bodyTemplate = templateConfig?.value || defaultTemplate

                    let secondStudentNameInfo = ''
                    if (lead.second_student_name) {
                        secondStudentNameInfo = `\n·2人目の名前： ${lead.second_student_name} 様`
                    }

                    const gchatMessage = bodyTemplate
                        .replace(/\{\{name\}\}/g, lead.name || '未設定')
                        .replace(/\{\{coach_name\}\}/g, profile.full_name || '未設定')
                        .replace(/\{\{confirmed_datetime\}\}/g, confirmedDate || '未設定')
                        .replace(/\{\{confirmed_location\}\}/g, confirmedLocation || '未設定')
                        .replace(/\{\{second_student_info\}\}/g, secondStudentNameInfo)

                    await sendGoogleChatMessage(webhook.webhook_url, gchatMessage, `lead_${leadId}`)

                    // 指定のWebhook（追加通知先）への新規送信
                    try {
                        const { data: assignedWebhookConfig } = await supabase
                            .from('app_configs')
                            .select('value')
                            .eq('key', 'lead_assigned_webhook_url')
                            .maybeSingle()

                        if (assignedWebhookConfig?.value) {
                            // 追加通知用のテンプレートを取得
                            const { data: additionalTemplateConfig } = await supabase
                                .from('app_configs')
                                .select('value')
                                .eq('key', 'lead_assigned_additional_webhook_template')
                                .maybeSingle()

                            const additionalTemplate = additionalTemplateConfig?.value || bodyTemplate
                            const additionalGchatMessage = additionalTemplate
                                .replace(/\{\{name\}\}/g, lead.name || '未設定')
                                .replace(/\{\{coach_name\}\}/g, profile.full_name || '未設定')
                                .replace(/\{\{confirmed_datetime\}\}/g, confirmedDate || '未設定')
                                .replace(/\{\{confirmed_location\}\}/g, confirmedLocation || '未設定')
                                .replace(/\{\{second_student_info\}\}/g, secondStudentNameInfo)

                            await sendGoogleChatMessage(assignedWebhookConfig.value, additionalGchatMessage)
                        }
                    } catch (additionalGchatErr) {
                        console.error('Failed to send additional assign notification:', additionalGchatErr)
                    }
                }
            } catch (gchatErr) {
                console.error('Failed to send assign notification to Google Chat:', gchatErr)
            }
        }

        revalidatePath('/coach/leads')
        revalidatePath('/admin/leads')
        return { success: true, coachName: profile.full_name }
    } catch (error: any) {
        console.error('Failed to assign lead:', error)
        return { success: false, error: error.message || 'アサイン処理に失敗しました' }
    }
}

// 3. Webhookの追加
export async function createWebhookAction(spaceName: string, webhookUrl: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('google_chat_webhooks')
            .insert({ space_name: spaceName, webhook_url: webhookUrl, active: true })

        if (error) throw error
        revalidatePath('/admin/leads')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to create webhook:', error)
        return { success: false, error: error.message || 'Webhookの登録に失敗しました' }
    }
}

// 4. Webhookの削除
export async function deleteWebhookAction(id: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('google_chat_webhooks')
            .delete()
            .eq('id', id)

        if (error) throw error
        revalidatePath('/admin/leads')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to delete webhook:', error)
        return { success: false, error: error.message || 'Webhookの削除に失敗しました' }
    }
}

// 5. Webhookの有効・無効切り替え
export async function toggleWebhookAction(id: string, active: boolean) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('google_chat_webhooks')
            .update({ active })
            .eq('id', id)

        if (error) throw error
        revalidatePath('/admin/leads')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to toggle webhook:', error)
        return { success: false, error: error.message || 'Webhookの更新に失敗しました' }
    }
}

// 6. 体験レッスン案件通知テンプレートの取得
export async function getLeadNotificationTemplateAction() {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', 'lead_notification_template')
            .single()

        if (error) throw error
        return { success: true, value: data?.value || '' }
    } catch (error: any) {
        console.error('Failed to get template:', error)
        return { success: false, error: error.message || 'テンプレートの取得に失敗しました' }
    }
}

// 6.5. 体験レッスンアサイン確定通知（Google Chat）のメッセージテンプレートの取得
export async function getLeadAssignedNotificationTemplateAction() {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', 'lead_assigned_notification_template')
            .single()

        if (error && error.code !== 'PGRST116') throw error // PGRST116 is single row empty
        return { success: true, value: data?.value || '' }
    } catch (error: any) {
        console.error('Failed to get lead assigned template:', error)
        return { success: false, error: error.message || 'アサイン確定通知テンプレートの取得に失敗しました' }
    }
}

// 6.6. 体験レッスンアサイン確定通知（Google Chat）のメッセージテンプレートの保存
export async function saveLeadAssignedNotificationTemplateAction(template: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user?.id || '')
            .single()

        if (profile?.role !== 'admin') {
            return { success: false, error: '管理者権限が必要です。' }
        }

        const supabaseAdmin = createAdminClient()
        const { error } = await supabaseAdmin
            .from('app_configs')
            .upsert({ 
                key: 'lead_assigned_notification_template', 
                value: template,
                description: '体験レッスンアサイン確定時のGoogle Chat向け通知メッセージテンプレート（変数: {{name}}, {{coach_name}}, {{confirmed_datetime}}, {{confirmed_location}}, {{second_student_info}}）'
            }, { onConflict: 'key' })

        if (error) throw error
        revalidatePath('/admin/leads')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to save lead assigned template:', error)
        return { success: false, error: error.message || 'アサイン確定通知テンプレートの保存に失敗しました' }
    }
}

// 6.6.5. 体験レッスンアサイン確定追加通知（Google Chat指定Webhook）のメッセージテンプレートの取得
export async function getLeadAssignedAdditionalWebhookTemplateAction() {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', 'lead_assigned_additional_webhook_template')
            .single()

        if (error && error.code !== 'PGRST116') throw error // PGRST116 is single row empty
        return { success: true, value: data?.value || '' }
    } catch (error: any) {
        console.error('Failed to get lead assigned additional template:', error)
        return { success: false, error: error.message || '追加通知テンプレートの取得に失敗しました' }
    }
}

// 6.6.6. 体験レッスンアサイン確定追加通知（Google Chat指定Webhook）のメッセージテンプレートの保存
export async function saveLeadAssignedAdditionalWebhookTemplateAction(template: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user?.id || '')
            .single()

        if (profile?.role !== 'admin') {
            return { success: false, error: '管理者権限が必要です。' }
        }

        const supabaseAdmin = createAdminClient()
        const { error } = await supabaseAdmin
            .from('app_configs')
            .upsert({ 
                key: 'lead_assigned_additional_webhook_template', 
                value: template,
                description: '体験レッスンアサイン確定追加通知（指定Webhook）のメッセージテンプレート（変数: {{name}}, {{coach_name}}, {{confirmed_datetime}}, {{confirmed_location}}, {{second_student_info}}）'
            }, { onConflict: 'key' })

        if (error) throw error
        revalidatePath('/admin/leads')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to save lead assigned additional template:', error)
        return { success: false, error: error.message || '追加通知テンプレートの保存に失敗しました' }
    }
}

// 6.7. アサイン確定追加通知先 Webhook URL の取得
export async function getLeadAssignedWebhookUrlAction() {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', 'lead_assigned_webhook_url')
            .single()

        if (error && error.code !== 'PGRST116') throw error // PGRST116 is single row empty
        return { success: true, value: data?.value || '' }
    } catch (error: any) {
        console.error('Failed to get lead assigned webhook url:', error)
        return { success: false, error: error.message || '追加通知先Webhook URLの取得に失敗しました' }
    }
}

// 6.8. アサイン確定追加通知先 Webhook URL の保存
export async function saveLeadAssignedWebhookUrlAction(url: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user?.id || '')
            .single()

        if (profile?.role !== 'admin') {
            return { success: false, error: '管理者権限が必要です。' }
        }

        const supabaseAdmin = createAdminClient()
        const { error } = await supabaseAdmin
            .from('app_configs')
            .upsert({ 
                key: 'lead_assigned_webhook_url', 
                value: url,
                description: '体験レッスンアサイン確定時の追加送信先Google Chat Webhook URL（スレッド指定なしで新規送信されます）'
            }, { onConflict: 'key' })

        if (error) throw error
        revalidatePath('/admin/leads')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to save lead assigned webhook url:', error)
        return { success: false, error: error.message || '追加通知先Webhook URLの保存に失敗しました' }
    }
}


// 7. 体験レッスン案件通知テンプレートの保存
export async function saveLeadNotificationTemplateAction(template: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user?.id || '')
            .single()

        if (profile?.role !== 'admin') {
            return { success: false, error: '管理者権限が必要です。' }
        }

        const supabaseAdmin = createAdminClient()
        const { error } = await supabaseAdmin
            .from('app_configs')
            .upsert({ 
                key: 'lead_notification_template', 
                value: template,
                description: '体験レッスン案件通知（Google Chat）のメッセージテンプレート（変数: {{area}}, {{location}}, {{datetime1}}, {{datetime2}}, {{datetime3}}, {{skill_level}}, {{frequency}}, {{notes}}, {{assign_url}}, {{name}}, {{gender}}, {{age}}, {{second_student_info}}, {{available_times}}）'
            }, { onConflict: 'key' })

        if (error) throw error
        revalidatePath('/admin/leads')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to save template:', error)
        return { success: false, error: error.message || 'テンプレートの保存に失敗しました' }
    }
}

// 8. コーチページ個人情報マスク設定の取得
export async function getHidePersonalInfoAction() {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', 'hide_lead_personal_info')
            .single()

        if (error) throw error
        return { success: true, value: data?.value === 'true' }
    } catch (error: any) {
        console.error('Failed to get hide config:', error)
        return { success: false, error: error.message || '設定の取得に失敗しました' }
    }
}

// 9. コーチページ個人情報マスク設定の保存
export async function saveHidePersonalInfoAction(hide: boolean) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user?.id || '')
            .single()

        if (profile?.role !== 'admin') {
            return { success: false, error: '管理者権限が必要です。' }
        }

        const supabaseAdmin = createAdminClient()
        const { error } = await supabaseAdmin
            .from('app_configs')
            .upsert({ 
                key: 'hide_lead_personal_info', 
                value: hide ? 'true' : 'false',
                description: 'コーチ用案件紹介ページでリードの個人情報（氏名、電話番号、メールアドレスなど）をマスクするかどうか（true/false）'
            }, { onConflict: 'key' })

        if (error) throw error
        revalidatePath('/admin/leads')
        revalidatePath('/coach/leads')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to save hide config:', error)
        return { success: false, error: error.message || '設定の保存に失敗しました' }
    }
}

const defaultDisplaySettings = {
    name: 'mask',
    full_name_kana: 'mask',
    gender: 'show',
    age: 'show',
    email: 'mask',
    phone: 'mask',
    area: 'show',
    lesson_location: 'show',
    frequency: 'show',
    available_times: 'show',
    skill_level: 'show',
    notes: 'show',
    datetime: 'show',
    second_student: 'show'
}

// 10. コーチページ項目ごと表示設定の取得
export async function getDisplaySettingsAction() {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', 'lead_display_settings')
            .single()

        if (error) {
            // レコードがない場合はデフォルト値を返す
            return { success: true, value: defaultDisplaySettings }
        }
        
        const settings = JSON.parse(data.value)
        return { success: true, value: { ...defaultDisplaySettings, ...settings } }
    } catch (error: any) {
        console.error('Failed to get display settings:', error)
        return { success: false, error: error.message || '表示設定の取得に失敗しました' }
    }
}

// 11. コーチページ項目ごと表示設定の保存
export async function saveDisplaySettingsAction(settings: any) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user?.id || '')
            .single()

        if (profile?.role !== 'admin') {
            return { success: false, error: '管理者権限が必要です。' }
        }

        const supabaseAdmin = createAdminClient()
        const { error } = await supabaseAdmin
            .from('app_configs')
            .upsert({ 
                key: 'lead_display_settings', 
                value: JSON.stringify(settings),
                description: 'コーチ用案件紹介ページで表示するリードの各項目の公開設定（show:表示 / mask:隠して一部表示 / hide:非表示）'
            }, { onConflict: 'key' })

        if (error) throw error
        revalidatePath('/admin/leads')
        revalidatePath('/coach/leads')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to save display settings:', error)
        return { success: false, error: error.message || '表示設定の保存に失敗しました' }
    }
}

// 12. LINE通知設定（トークンとテンプレート）の取得
export async function getLineConfigAction() {
    const supabase = await createClient()

    try {
        const { data: tokenData } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', 'line_channel_access_token')
            .single()

        const { data: templateData } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', 'line_assigned_template')
            .single()

        const defaultLineAssignedTemplate = `{{name}} 様

お申し込みいただいた体験レッスンの担当コーチが決定いたしました。

■ 担当コーチ: {{coach_name}}
■ 確定体験日時: {{lesson_date}}
■ レッスン場所: {{location}}
{{second_student_info}}

別途、担当コーチよりレッスンの日時調整等のご連絡をさせていただきます。
ご連絡をお待ちいただけますようお願いいたします。

Swim Partners`

        return {
            success: true,
            token: tokenData?.value || '',
            template: templateData?.value || defaultLineAssignedTemplate
        }
    } catch (error: any) {
        console.error('Failed to get LINE config:', error)
        return { success: false, error: error.message || 'LINE設定の取得に失敗しました' }
    }
}

// 13. LINE通知設定（トークンとテンプレート）の保存
export async function saveLineConfigAction(token: string, template: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user?.id || '')
            .single()

        if (profile?.role !== 'admin') {
            return { success: false, error: '管理者権限が必要です。' }
        }

        const supabaseAdmin = createAdminClient()

        // トークンの upsert
        const { error: tokenError } = await supabaseAdmin
            .from('app_configs')
            .upsert({ 
                key: 'line_channel_access_token', 
                value: token,
                description: '顧客へのLINEプッシュ送信に使用するLINE Channel Access Token（Messaging API）'
            }, { onConflict: 'key' })

        if (tokenError) throw tokenError

        // テンプレートの upsert
        const { error: templateError } = await supabaseAdmin
            .from('app_configs')
            .upsert({ 
                key: 'line_assigned_template', 
                value: template,
                description: '体験レッスンの担当コーチ決定時（アサイン確定時）に顧客のLINEに送信するメッセージテンプレート（変数: {{name}}, {{coach_name}}, {{coach_line_url}}, {{lesson_date}}, {{location}}, {{second_student_info}}）'
            }, { onConflict: 'key' })

        if (templateError) throw templateError

        revalidatePath('/admin/leads')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to save LINE config:', error)
        return { success: false, error: error.message || 'LINE設定の保存に失敗しました' }
    }
}

// 14. リードを手動で完了状態にする（アサイン未完了でも管理者が手動でクローズする）
export async function completeLeadManuallyAction(leadId: string) {
    const supabase = await createClient()

    try {
        // 管理者チェック
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('認証エラー: ログインしてください')

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            throw new Error('管理者権限が必要です')
        }

        // リードのステータスを「手動完了」に更新
        // assigned_coach_id に管理者のIDを設定することで一覧から非表示になる
        const { error: updateError } = await supabase
            .from('leads')
            .update({
                status: '手動完了',
                assigned_coach_id: user.id,
                assigned_at: new Date().toISOString()
            })
            .eq('id', leadId)

        if (updateError) throw updateError

        revalidatePath('/admin/leads')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to manually complete lead:', error)
        return { success: false, error: error.message || '完了処理に失敗しました' }
    }
}

// 15. 体験レッスン案件（リード）を手動で新規作成する
export async function createLeadManuallyAction(leadData: {
    name: string
    full_name_kana?: string | null
    gender?: string | null
    birth_date?: string | null
    email?: string | null
    phone?: string | null
    line_user_id?: string | null
    area?: string | null
    lesson_location?: string | null
    datetime1?: string | null
    datetime2?: string | null
    datetime3?: string | null
    available_times?: string | null
    frequency?: string | null
    skill_level?: string | null
    notes?: string | null
    second_student_name?: string | null
    second_student_kana?: string | null
    second_student_gender?: string | null
    second_student_birth_date?: string | null
    send_customer_notification?: boolean
}) {
    const supabase = await createClient()

    try {
        // 管理者チェック
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('認証エラー: ログインしてください')

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            throw new Error('管理者権限が必要です')
        }

        // 空文字列はnullに置換するクリーンアップ処理（boolean値はそのまま保持）
        const cleanData: any = {}
        for (const [key, value] of Object.entries(leadData)) {
            if (typeof value === 'boolean') {
                cleanData[key] = value
            } else {
                cleanData[key] = value === '' ? null : value
            }
        }

        // leadsにインサート
        const { data, error } = await supabase
            .from('leads')
            .insert({
                ...cleanData,
                status: '新規',
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/admin/leads')
        return { success: true, lead: data }
    } catch (error: any) {
        console.error('Failed to create lead manually:', error)
        return { success: false, error: error.message || '手動案件の作成に失敗しました' }
    }
}

// 16. 体験レッスン案件（リード）を手動で更新する
export async function updateLeadAction(leadId: string, leadData: {
    name: string
    full_name_kana?: string | null
    gender?: string | null
    birth_date?: string | null
    email?: string | null
    phone?: string | null
    line_user_id?: string | null
    area?: string | null
    lesson_location?: string | null
    datetime1?: string | null
    datetime2?: string | null
    datetime3?: string | null
    available_times?: string | null
    frequency?: string | null
    skill_level?: string | null
    notes?: string | null
    second_student_name?: string | null
    second_student_kana?: string | null
    second_student_gender?: string | null
    second_student_birth_date?: string | null
    send_customer_notification?: boolean
    status?: string | null
}) {
    const supabase = await createClient()

    try {
        // 管理者チェック
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('認証エラー: ログインしてください')

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            throw new Error('管理者権限が必要です')
        }

        // 空文字列はnullに置換するクリーンアップ処理（boolean値はそのまま保持）
        const cleanData: any = {}
        for (const [key, value] of Object.entries(leadData)) {
            if (typeof value === 'boolean') {
                cleanData[key] = value
            } else {
                cleanData[key] = value === '' ? null : value
            }
        }

        // leadsを更新
        const { data, error } = await supabase
            .from('leads')
            .update({
                ...cleanData
            })
            .eq('id', leadId)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/admin/leads')
        return { success: true, lead: data }
    } catch (error: any) {
        console.error('Failed to update lead manually:', error)
        return { success: false, error: error.message || '案件の更新に失敗しました' }
    }
}

