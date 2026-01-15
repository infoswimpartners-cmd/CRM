
import nodemailer from 'nodemailer'

interface EmailOptions {
    to: string
    subject: string
    text: string
    html?: string
    bcc?: string
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

    async sendEmail({ to, subject, text, html, bcc }: EmailOptions): Promise<boolean> {
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

            console.log('Message sent: %s', info.messageId)
            return true
        } catch (error) {
            console.error('Error sending email:', error)
            return false
        }
    }
}

export const emailService = new EmailService()
