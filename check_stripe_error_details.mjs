import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { Stripe } from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

async function main() {
    const testSubId = 'sub_1SvYD2P0UQGtpYXmIxYZ4fX0' // We know this causes the mode error
    try {
        await stripe.subscriptions.retrieve(testSubId)
    } catch (e) {
        console.log('Error Message:', e.message)
        console.log('Error Code:', e.code)
        console.log('Error Type:', e.type)
    }
}
main()
