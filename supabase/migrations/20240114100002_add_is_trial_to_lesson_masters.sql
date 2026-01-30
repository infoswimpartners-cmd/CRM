
-- Add is_trial column to lesson_masters
ALTER TABLE lesson_masters ADD COLUMN is_trial boolean DEFAULT false NOT NULL;

-- Update RLS policies if necessary (existing policies likely cover "all" columns, so might not be needed explicitly)
-- But ensuring comment on column
COMMENT ON COLUMN lesson_masters.is_trial IS 'Flag to identify trial lessons for fixed reward calculation';

-- Reload schema cache
NOTIFY pgrst, 'reload config';
