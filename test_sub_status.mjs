import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { Stripe } from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

async function main() {
    const sub = await stripe.subscriptions.retrieve('sub_1T8ZqsP0UQGtpYXms7suvqQT')
    console.log('Status:', sub.status)
}
main()
