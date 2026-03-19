import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

async function main() {
    const subId = 'sub_1T8rcEP0UQGtpYXmhec1RE5O'
    try {
        const sub = await stripe.subscriptions.retrieve(subId);
        console.log('Status:', sub.status);
        console.log('Items:', JSON.stringify(sub.items.data.map(i => ({
            id: i.id,
            price: i.price.id,
            nickname: i.price.nickname
        })), null, 2));

        const nextInvoice = await stripe.invoices.retrieveUpcoming({
            subscription: subId
        });
        console.log('Next Invoice Items:', JSON.stringify(nextInvoice.lines.data.map(l => ({
            description: l.description,
            amount: l.amount,
            period: l.period
        })), null, 2));

    } catch (e) {
        console.error(e)
    }
}
main()
