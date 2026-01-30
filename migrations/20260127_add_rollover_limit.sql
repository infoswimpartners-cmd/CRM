
-- Add max_rollover_limit to membership_types
ALTER TABLE membership_types 
ADD COLUMN max_rollover_limit INTEGER DEFAULT 0;

-- Update existing records based on user rules
-- Assuming names roughly match '月2回' and '月4回'
UPDATE membership_types 
SET max_rollover_limit = 1 
WHERE name LIKE '%月2回%';

UPDATE membership_types 
SET max_rollover_limit = 2 
WHERE name LIKE '%月4回%';
