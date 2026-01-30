-- Update student status check constraint to include 'trial_confirmed'
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_status_check;
ALTER TABLE students ADD CONSTRAINT students_status_check CHECK (status IN ('trial_pending', 'trial_confirmed', 'trial_done', 'active', 'resting', 'withdrawn'));
