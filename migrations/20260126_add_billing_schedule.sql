
-- Add columns for scheduled billing
ALTER TABLE public.lesson_schedules 
ADD COLUMN IF NOT EXISTS billing_scheduled_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Comment on columns
COMMENT ON COLUMN public.lesson_schedules.billing_scheduled_at IS 'Date when the automatic charge should be executed';
COMMENT ON COLUMN public.lesson_schedules.notification_sent_at IS 'Date when the billing notice email was sent';
