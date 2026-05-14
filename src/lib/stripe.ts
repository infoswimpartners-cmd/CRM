import Stripe from 'stripe';

// 環境に応じて適切なキーを選択
const isProduction = process.env.NODE_ENV === 'production';
const secretKey = isProduction
    ? (process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY)
    : (process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);

if (!secretKey) {
    console.error('❌ CRITICAL: Stripe Secret Key is missing in environment variables.');
}

export const stripe = new Stripe(secretKey || 'missing_key_restart_needed', {
    // TypeScriptの型定義に合わせる
    apiVersion: '2025-12-15.clover' as any, 
    typescript: true,
});





