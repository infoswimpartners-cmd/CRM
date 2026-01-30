
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { emailService } from '../src/lib/email';

async function testEmail() {
    console.log('Testing email sending...');
    const targetEmail = process.env.SMTP_USER || 'shinworking980312@gmail.com'; // Use sender or specific test email

    const success = await emailService.sendTemplateEmail(
        'trial_payment_request',
        targetEmail,
        {
            name: 'テスト生徒',
            lesson_date: '2026年1月25日 10:00',
            amount: '3,300',
            payment_link: 'https://example.com/pay'
        }
    );

    if (success) {
        console.log('Email sent successfully to', targetEmail);
    } else {
        console.error('Failed to send email.');
    }
}

testEmail();
