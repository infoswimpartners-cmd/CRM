
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { emailService } from '../src/lib/email'

async function test() {
    console.log('Testing Email Service...')
    console.log('SMTP_USER:', process.env.SMTP_USER)
    console.log('SMTP_HOST:', process.env.SMTP_HOST)

    if (!process.env.SMTP_USER) {
        console.error('SMTP_USER not found in env')
        return
    }

    try {
        const result = await emailService.sendEmail({
            to: process.env.SMTP_USER, // Send to self
            subject: '【テスト】Swim Partners システムメール',
            text: 'これはテストメールです。システムからの送信確認です。'
        })

        if (result) {
            console.log('✅ Email sent successfully!')
        } else {
            console.error('❌ Email failed to send.')
        }
    } catch (e) {
        console.error('❌ Error:', e)
    }
}

test()
