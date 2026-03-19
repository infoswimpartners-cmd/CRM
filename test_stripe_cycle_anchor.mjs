import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { Stripe } from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

async function main() {
    const customerId = 'cus_U6NrPyo7kUgCiq'; // 古川彰人 (Furukawa)
    const priceId = 'price_1SwKVdP0UQGtpYXmjXxiPSK6'; // 単発 (Fee=0)

    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1) // 1st of next month
    const nextMonthTimestamp = Math.floor(nextMonth.getTime() / 1000)

    const subscriptionParams = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        billing_cycle_anchor: nextMonthTimestamp,
        proration_behavior: 'none',
        add_invoice_items: [{
            price: priceId,
            quantity: 1
        }]
    }

    try {
        const subscription = await stripe.subscriptions.create(subscriptionParams)
        console.log('Created sub:', subscription.id)
    } catch (e) {
        console.error('Error:', e.message)
        console.error('Code:', e.code)
    }
}
main()
