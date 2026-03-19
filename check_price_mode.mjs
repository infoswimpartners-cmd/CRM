import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { Stripe } from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

async function main() {
    const priceId = 'price_1SwKVdP0UQGtpYXmjXxiPSK6'
    try {
        const price = await stripe.prices.retrieve(priceId)
        console.log(`Price Found: ${price.id}`)
    } catch (e) {
        console.error(e.message)
    }
}
main()
