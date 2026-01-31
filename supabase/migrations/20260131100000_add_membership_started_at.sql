-- Add membership_started_at column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS membership_started_at TIMESTAMPTZ;

-- Comment on column
COMMENT ON COLUMN students.membership_started_at IS 'When the current membership plan started. Used for calculating rollover and validity.';
