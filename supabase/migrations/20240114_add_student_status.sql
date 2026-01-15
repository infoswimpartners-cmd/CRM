-- Add status column to students table
ALTER TABLE students ADD COLUMN status text DEFAULT 'inquiry';

-- Optional: Add a check constraint to ensure validity, though application level validation is often enough for flexibility.
-- VALIDATION: 'inquiry', 'trial_pending', 'trial_done', 'active', 'resting', 'withdrawn'
ALTER TABLE students ADD CONSTRAINT students_status_check 
CHECK (status IN ('inquiry', 'trial_pending', 'trial_done', 'active', 'resting', 'withdrawn'));

-- Comment on column for documentation
COMMENT ON COLUMN students.status IS 'Student lifecycle status: inquiry, trial_pending, trial_done, active, resting, withdrawn';
