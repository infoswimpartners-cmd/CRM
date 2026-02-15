-- Add stripe_product_id to lesson_masters
alter table lesson_masters add column if not exists stripe_product_id text;

-- Add stripe_product_id to membership_types
-- (stripe_price_id is already added in a previous migration)
alter table membership_types add column if not exists stripe_product_id text;
