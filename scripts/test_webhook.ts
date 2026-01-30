
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function testWebhook() {
    const url = 'http://localhost:3000/api/webhooks/onboarding'
    // Mock data as if from Typeform or similar
    const payload = {
        name: 'Test Missing Student',
        email: 'shinshin980312kodai@gmail.com',
        message: 'Testing registration via script',
        type: 'inquiry'
    }

    console.log('Sending payload:', payload)

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        const json = await res.json()
        console.log('Status:', res.status)
        console.log('Response:', json)

    } catch (e) {
        console.error('Fetch Error:', e)
    }
}

testWebhook()
