-- Add stripe_price_id to membership_types
alter table membership_types add column stripe_price_id text;

-- Add stripe_subscription_id to students
alter table students add column stripe_subscription_id text;
