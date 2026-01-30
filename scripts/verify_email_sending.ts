import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function testSend() {
    // Dynamic import to ensure process.env is populated first
    const { emailService } = await import('../src/lib/email')

    console.log('Attempting to send test email...')
    const success = await emailService.sendEmail({
        to: 'info.swimpartners@gmail.com',
        subject: 'SMTP Configuration Test',
        text: 'If you receive this, SMTP is working correctly.'
    })

    if (success) {
        console.log('✅ Email sent successfully!')
    } else {
        console.error('❌ Email sending failed. Check logs above.')
    }
}

testSend()
