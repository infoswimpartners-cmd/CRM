-- Add price column to lesson_schedules
ALTER TABLE public.lesson_schedules 
ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.lesson_schedules.price IS 'Calculated price for overage billing, awaiting approval';
