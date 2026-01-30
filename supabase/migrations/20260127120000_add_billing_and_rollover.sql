
-- 1. Add columns for scheduled billing (from previous pending migration)
ALTER TABLE public.lesson_schedules 
ADD COLUMN IF NOT EXISTS billing_scheduled_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.lesson_schedules.billing_scheduled_at IS 'Date when the automatic charge should be executed';
COMMENT ON COLUMN public.lesson_schedules.notification_sent_at IS 'Date when the billing notice email was sent';

-- 2. Add max_rollover_limit to membership_types
ALTER TABLE public.membership_types 
ADD COLUMN IF NOT EXISTS max_rollover_limit INTEGER DEFAULT 0;

-- 3. Update existing records based on user rules
UPDATE public.membership_types 
SET max_rollover_limit = 1 
WHERE name LIKE '%月2回%';

UPDATE public.membership_types 
SET max_rollover_limit = 2 
WHERE name LIKE '%月4回%';
