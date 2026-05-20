import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.vercel' });

async function main() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        console.error('Stripe Secret Key is missing');
        return;
    }

    const stripe = new Stripe(key, { apiVersion: '2025-12-15.clover' });

    try {
        const price = await stripe.prices.retrieve('price_1SwKVdP0UQGtpYXmjXxiPSK6', {
            expand: ['product']
        });
        console.log('Price Details:');
        console.log(`ID: ${price.id}`);
        console.log(`Amount: ${price.unit_amount}`);
        console.log(`Currency: ${price.currency}`);
        console.log(`Recurring: ${JSON.stringify(price.recurring)}`);
        console.log(`Product Name: ${price.product && typeof price.product === 'object' ? price.product.name : 'Unknown'}`);
    } catch (e) {
        console.error('Error fetching price:', e.message);
    }
}

main();
