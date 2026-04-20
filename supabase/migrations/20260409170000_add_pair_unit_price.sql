-- Add pair_unit_price to lesson_masters
ALTER TABLE lesson_masters ADD COLUMN IF NOT EXISTS pair_unit_price INTEGER;

COMMENT ON COLUMN lesson_masters.pair_unit_price IS '2名同時レッスン時の販売単価';
