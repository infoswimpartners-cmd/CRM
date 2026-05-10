import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listTestPrices() {
    const key = process.env.STRIPE_SECRET_KEY_TEST;
    if (!key) {
        console.error('Stripe Test Key is missing');
        return;
    }

    const stripe = new Stripe(key, { apiVersion: '2025-12-15.clover' });

    try {
        const prices = await stripe.prices.list({
            expand: ['data.product'],
            active: true
        });

        console.log('Available TEST Mode Prices:');
        const formatted = prices.data.map(p => ({
            id: p.id,
            name: p.product && typeof p.product === 'object' ? p.product.name : 'Unknown',
            amount: p.unit_amount,
            currency: p.currency
        }));
        console.table(formatted);
    } catch (e) {
        console.error('Error fetching prices:', e.message);
    }
}

listTestPrices();
