import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

function checkKey() {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
        console.error('No STRIPE_SECRET_KEY found!')
        return
    }

    if (key.startsWith('sk_test_')) {
        console.log('✅ Key is TEST mode (starts with sk_test_)')
    } else if (key.startsWith('sk_live_')) {
        console.error('⚠️ Key is LIVE mode (starts with sk_live_)')
    } else {
        console.warn('❓ Key format unknown:', key.substring(0, 8) + '...')
    }
}

checkKey()
