
import nodemailer from 'nodemailer'
import { createAdminClient } from '@/lib/supabase/admin'

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

    async sendEmail({ to, subject, text, html, bcc, requireApproval = true }: EmailOptions): Promise<boolean> {
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

            let subject = template.subject
            let body = template.body

            // Replace variables
            for (const [k, v] of Object.entries(variables)) {
                // Match {{key}}
                const regex = new RegExp(`{{ ${k}}
        }`, 'g')
                subject = subject.replace(regex, v)
                body = body.replace(regex, v)
            }

            return this.sendEmail({
                to,
                subject,
                text: body,
            })
        } catch (e) {
            console.error('Error in sendTemplateEmail:', e)
            return false
        }
    }
}

export const emailService = new EmailService()
