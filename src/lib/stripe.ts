import Stripe from 'stripe';

// 環境変数の優先順位: LIVE -> TEST -> 汎用
// Vercel等で STRIPE_SECRET_KEY が1つだけ設定されている場合も正しく動作します
const secretKey = process.env.STRIPE_SECRET_KEY_LIVE || 
                  process.env.STRIPE_SECRET_KEY_TEST || 
                  process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
    console.error('❌ CRITICAL: Stripe Secret Key is missing in environment variables.');
}

export const stripe = new Stripe(secretKey || 'missing_key_restart_needed', {
    apiVersion: '2023-10-16', 
    typescript: true,
});




