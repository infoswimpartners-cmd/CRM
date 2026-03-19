import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { Stripe } from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

async function main() {
    const subId = 'sub_1SvYD2P0UQGtpYXmIxYZ4fX0'
    try {
        const sub = await stripe.subscriptions.retrieve(subId)
        console.log(`Sub: ${subId}`)
        console.log(`Created: ${new Date(sub.created * 1000).toISOString()}`)
        console.log(`Status: ${sub.status}`)
        console.log(`Plan: ${sub.items.data[0].price.id}`)
    } catch (e) {
        console.error(e.message)
    }
}
main()
