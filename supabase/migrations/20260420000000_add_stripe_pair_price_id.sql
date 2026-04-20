-- Add stripe_pair_price_id to lesson_masters
ALTER TABLE lesson_masters ADD COLUMN IF NOT EXISTS stripe_pair_price_id TEXT;

COMMENT ON COLUMN lesson_masters.stripe_pair_price_id IS 'Stripeでのペア受講用価格ID';
