import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    console.log("Running migration: adding pair fields to membership_types...")

    const sql = `
        ALTER TABLE membership_types ADD COLUMN IF NOT EXISTS pair_fee INTEGER;
        ALTER TABLE membership_types ADD COLUMN IF NOT EXISTS stripe_pair_product_id TEXT;
        ALTER TABLE membership_types ADD COLUMN IF NOT EXISTS stripe_pair_price_id TEXT;

        COMMENT ON COLUMN membership_types.pair_fee IS 'ペア受講時の月謝料金（会費）';
        COMMENT ON COLUMN membership_types.stripe_pair_product_id IS 'Stripeでのペア受講用商品ID';
        COMMENT ON COLUMN membership_types.stripe_pair_price_id IS 'Stripeでのペア受講用価格ID';
    `;

    const { error } = await supabase.rpc('execute_sql', { sql })

    if (error) {
        console.error('Migration failed:', error)
    } else {
        console.log('Migration successful: pair_fee, stripe_pair_product_id, stripe_pair_price_id added to membership_types.')
    }
}
main()
