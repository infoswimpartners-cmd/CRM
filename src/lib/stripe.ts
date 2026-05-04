import Stripe from 'stripe';

const secretKey = process.env.NODE_ENV === 'production'
    ? process.env.STRIPE_SECRET_KEY_LIVE
    : (process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY);

if (!secretKey) {
    console.warn('⚠️ Stripe Secret Key is missing. Stripe features will not work.');
}

export const stripe = new Stripe(secretKey ?? 'dummy_key', {
    apiVersion: '2025-12-15.clover',
    typescript: true,
});
