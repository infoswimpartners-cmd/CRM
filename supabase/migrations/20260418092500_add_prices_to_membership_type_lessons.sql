-- Add unit_price and pair_unit_price to membership_type_lessons
ALTER TABLE membership_type_lessons ADD COLUMN IF NOT EXISTS unit_price integer;
ALTER TABLE membership_type_lessons ADD COLUMN IF NOT EXISTS pair_unit_price integer;

COMMENT ON COLUMN membership_type_lessons.unit_price IS 'その会員区分におけるレッスン通常受講料';
COMMENT ON COLUMN membership_type_lessons.pair_unit_price IS 'その会員区分におけるレッスンペア受講料';
