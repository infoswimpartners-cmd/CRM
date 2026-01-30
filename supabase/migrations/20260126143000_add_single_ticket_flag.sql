
-- Add is_single_ticket column to lesson_masters
ALTER TABLE public.lesson_masters
ADD COLUMN is_single_ticket boolean DEFAULT false;

-- Initial data migration: Set true for existing '単発' masters
UPDATE public.lesson_masters
SET is_single_ticket = true
WHERE name LIKE '%単発%';
