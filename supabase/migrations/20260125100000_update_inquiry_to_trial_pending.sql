-- Update inquiry status to trial_pending
-- This migration renames the 'inquiry' status to 'trial_pending' to better reflect its meaning

-- 1. Update existing data
UPDATE students 
SET status = 'trial_pending' 
WHERE status = 'inquiry';

-- 2. Update default value
ALTER TABLE students 
ALTER COLUMN status SET DEFAULT 'trial_pending';

-- 3. Drop existing constraint
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_status_check;

-- 4. Add new constraint (inquiry is removed from the list)
ALTER TABLE students ADD CONSTRAINT students_status_check 
CHECK (status IN ('trial_pending', 'trial_confirmed', 'trial_done', 'active', 'resting', 'withdrawn'));
