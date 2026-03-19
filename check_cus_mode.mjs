import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { Stripe } from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

async function main() {
    const cusId = 'cus_TtK6m51VAipyi7'
    try {
        const cus = await stripe.customers.retrieve(cusId)
        console.log(`Cus Found: ${cus.id}`)
    } catch (e) {
        console.error(e.message)
    }
}
main()
