import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { Stripe } from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

async function main() {
    const now = Math.floor(Date.now() / 1000)
    const twoHoursAgo = now - (3 * 3600) // 3 hours to be safe

    console.log(`Checking events since ${new Date(twoHoursAgo * 1000).toISOString()}...`)

    const events = await stripe.events.list({
        limit: 50,
        created: { gte: twoHoursAgo }
    })

    if (events.data.length === 0) {
        console.log("No events found in the last 3 hours.")
        return
    }

    for (const e of events.data) {
        console.log(`[${new Date(e.created * 1000).toISOString()}] ${e.type} | ID: ${e.id}`)
        if (e.data.object.id) {
            console.log(`   Object ID: ${e.data.object.id}`)
        }
    }
}
main()
