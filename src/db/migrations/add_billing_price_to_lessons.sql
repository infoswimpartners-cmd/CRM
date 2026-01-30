-- Add billing_price column to lessons table
ALTER TABLE lessons ADD COLUMN billing_price INTEGER DEFAULT 0;

-- Optional: Backfill existing data
-- This is tricky without knowing the history. 
-- For safety, we might default to 'price' for everyone, or 0? 
-- Given the issue is "Overbilling", defaulting to 0 is safer for Monthly members, but dangerous for Drop-ins.
-- Let's just add the column for now and handle the logic in code for NEW records.
-- For OLD records, the previous logic (checking current status) will apply if we fallback.
-- BUT, I want to switch to PURELY using billing_price.

-- Let's try to backfill intelligently:
-- If we can't easily determine past status, maybe we just set billing_price = price for now,
-- and the user manually fixes if needed? 
-- Or, we can use the `billing.ts` logic to set it.

UPDATE lessons SET billing_price = price; 
-- Then we might need to manually zero out billing_price for known monthly lessons?
-- For now, initialize with price.
