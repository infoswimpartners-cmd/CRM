import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { Stripe } from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
async function main() {
    const cus = 'cus_U6lHfcZAzlPF26'
    const subs = await stripe.subscriptions.list({ customer: cus, status: 'all' })
    console.log(subs.data)
}
main()
