
import nodemailer from 'nodemailer'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendGoogleChatMessage, replaceVariables } from '@/lib/google-chat'

interface EmailOptions {
    to: string
    subject: string
    text: string
    html?: string
    bcc?: string
    requireApproval?: boolean
}

export class EmailService {
    private transporter: nodemailer.Transporter

    constructor() {
        const smtpHost = process.env.SMTP_HOST
        const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10)
        const smtpUser = process.env.SMTP_USER
        const smtpPass = process.env.SMTP_PASS

        if (!smtpHost || !smtpUser || !smtpPass) {
            console.warn('SMTP Environment variables are missing (SMTP_HOST, SMTP_USER, SMTP_PASS)')
        }

        this.transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465, // true for 465, false for other ports
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        })
    }

    async _sendInternalEmail({ to, subject, text, html, bcc }: EmailOptions): Promise<boolean> {
        if (!process.env.SMTP_USER) {
            console.error('Cannot send email: SMTP configuration missing')
            return false
        }

        try {
            const info = await this.transporter.sendMail({
                from: process.env.SMTP_FROM || process.env.SMTP_USER, // Check generic FROM or default to USER
                to,
                bcc,
                subject,
                text,
                html,
            })

            console.log('Internal Message sent: %s', info.messageId)
            return true
        } catch (error) {
            console.error('Error sending internal email:', error)
            return false
        }
    }

    async sendEmail({ to, subject, text, html, bcc, requireApproval = false }: EmailOptions): Promise<boolean> {
        if (!requireApproval) {
            return this._sendInternalEmail({ to, subject, text, html, bcc })
        }

        try {
            const supabase = createAdminClient()

            const { data: approval, error } = await supabase
                .from('email_approvals')
                .insert({
                    to_email: to,
                    bcc_email: bcc || null,
                    subject,
                    text_body: text,
                    html_body: html || null,
                    status: 'pending'
                })
                .select('id')
                .single()

            if (error || !approval) {
                console.error('Failed to create email_approvals record:', error)
                return false
            }

            const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER
            if (!adminEmail) {
                console.error('ADMIN_EMAIL or SMTP_USER is not set. Cannot send approval request.')
                return false
            }

            const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
            const approveUrl = `${appUrl}/api/email/approve?id=${approval.id}`

            const approvalText = `メール送信の承認依頼です。
システムから以下の内容でメールが送信されようとしています。
内容を確認し、問題なければ以下のリンクをクリックして送信を承認してください。

■承認リンク（クリックすると直ちに送信されます）
${approveUrl}

■送信予定先: ${to}
■件名: ${subject}
■本文:
--------------------------------------------------
${text}
--------------------------------------------------`

            const sent = await this._sendInternalEmail({
                to: adminEmail,
                subject: '【要承認】メール送信の承認願い',
                text: approvalText,
            })

            if (sent) {
                console.log(`Email saved as pending (ID: ${approval.id}) and approval request sent to ${adminEmail}`)
                return true
            } else {
                return false
            }

        } catch (error) {
            console.error('Error queuing email for approval:', error)
            return false
        }
    }

    async sendTemplateEmail(key: string, to: string, variables: Record<string, string>): Promise<boolean> {
        try {
            const supabase = createAdminClient()
            const { data: template, error } = await supabase
                .from('email_templates')
                .select('*')
                .eq('key', key)
                .single()

            if (error || !template) {
                console.error(`Email Template '${key}' not found: `, error?.message)
                return false
            }

            if (template.is_auto_send_enabled === false) {
                console.log(`[Auto-Send Disabled] Skipping email template '${key}' to ${to}`);
                return true; // Return true to indicate it was intentionally skipped and not an error
            }

            let subject = template.subject
            let body = template.body

            // Replace variables
            for (const [k, v] of Object.entries(variables)) {
                // Match {{ key }}
                const regex = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g')
                subject = subject.replace(regex, v)
                body = body.replace(regex, v)
            }

            return this.sendEmail({
                to,
                subject,
                text: body,
                requireApproval: template.is_approval_required ?? false,
            })
        } catch (e) {
            console.error('Error in sendTemplateEmail:', e)
            return false
        }
    }
    async sendTriggerEmail(triggerId: string, to: string, variables: Record<string, string>): Promise<boolean> {
        try {
            const supabase = createAdminClient()
            const { data: trigger, error: triggerError } = await supabase
                .from('email_triggers')
                .select('template_id, is_enabled, google_chat_webhook_url, google_chat_enabled, google_chat_message_template')
                .eq('id', triggerId)
                .single()

            if (triggerError || !trigger) {
                console.error(`Email Trigger '${triggerId}' not found: `, triggerError?.message)
                return false
            }

            if (!trigger.is_enabled) {
                console.log(`[Trigger Disabled] Skipping trigger '${triggerId}'`)
                return true
            }

            // --- メールテンプレートを先に取得・レンダリング ---
            // Google Chat のデフォルトメッセージでメール本文を共用するため先に処理する
            let renderedSubject = ''
            let renderedBody = ''

            if (trigger.template_id) {
                const { data: template, error: templateError } = await supabase
                    .from('email_templates')
                    .select('*')
                    .eq('id', trigger.template_id)
                    .single()

                if (templateError || !template) {
                    console.error(`Email Template ID '${trigger.template_id}' not found for trigger '${triggerId}': `, templateError?.message)
                    return false
                }

                if (template.is_auto_send_enabled === false) {
                    console.log(`[Auto-Send Disabled] Skipping email template '${template.key}' to ${to}`)
                    return true
                }

                renderedSubject = template.subject
                renderedBody = template.body

                // 変数を置換
                for (const [k, v] of Object.entries(variables)) {
                    const regex = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g')
                    renderedSubject = renderedSubject.replace(regex, v)
                    renderedBody = renderedBody.replace(regex, v)
                }

                // メール送信
                await this.sendEmail({
                    to,
                    subject: renderedSubject,
                    text: renderedBody,
                    requireApproval: template.is_approval_required ?? false,
                })
            } else {
                console.log(`[Trigger No Template] Skipping email for '${triggerId}'`)
            }

            // --- Google Chat 送信 ---
            if (trigger.google_chat_enabled && trigger.google_chat_webhook_url) {
                try {
                    let message: string

                    if (trigger.google_chat_message_template) {
                        // カスタムテンプレートがある場合はそれを使用
                        message = replaceVariables(trigger.google_chat_message_template, { ...variables, to, trigger_id: triggerId })
                    } else if (renderedSubject || renderedBody) {
                        // カスタムテンプレートが空の場合 → メールと同じ件名＋本文を送信
                        message = `📧 *${renderedSubject}*\n\n${renderedBody}`
                    } else {
                        // テンプレートもメールもない場合のフォールバック
                        message = `🔔 *${triggerId}* が発火しました\n対象: ${to}`
                    }

                    await sendGoogleChatMessage(trigger.google_chat_webhook_url, message)
                } catch (chatErr) {
                    // Google Chatエラーはメール送信をブロックしない
                    console.error('[GoogleChat] Non-fatal error in trigger:', chatErr)
                }
            }

            return true
        } catch (e: any) {
            console.error('Error in sendTriggerEmail:', e)
            return false
        }
    }
}

export const emailService = new EmailService()
