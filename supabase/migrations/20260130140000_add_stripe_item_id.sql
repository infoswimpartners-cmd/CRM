
ALTER TABLE public.lesson_schedules 
ADD COLUMN IF NOT EXISTS stripe_invoice_item_id text;
