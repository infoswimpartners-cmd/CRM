
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function testWebhook() {
    const url = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') + '/api/webhooks/onboarding'
    const payload = {
        'お名前': 'テスト 太郎',
        'フリガナ': 'テスト タロウ',
        'メールアドレス': 'antigravity-test@example.com',
        '電話番号': '090-1234-5678',
        '最寄り駅': '渋谷駅',
        '種別': 'trial',
        '第一希望': '2026/04/01 10:00',
        '第二希望': '2026/04/02 11:00',
        '泳力・目標': 'クロール25m',
        'メッセージ': '体験レッスンのテストです。'
    }

    console.log('Sending mock webhook to:', url)
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        const data = await res.json()
        console.log('Status:', res.status)
        console.log('Response:', data)
    } catch (e) {
        console.error('Error:', e)
    }
}

testWebhook()
