import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27-pre.0' as any
})

async function check() {
    try {
        const sub = await stripe.subscriptions.retrieve('sub_1TLg3BP0UQGtpYXmLxQqJspa')
        console.log('Subscription details:')
        console.log('ID:', sub.id)
        console.log('Status:', sub.status)
        console.log('Price ID:', sub.items.data[0].price.id)
    } catch (e: any) {
        console.error('Error retrieving subscription:', e.message)
    }
}

check()
