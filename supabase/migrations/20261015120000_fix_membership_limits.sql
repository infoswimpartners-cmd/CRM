-- Migration: Fix membership_types monthly_lesson_limit and max_rollover_limit
-- Description:
-- Plans with '月2回' (or '2回' not including '12回', '24回', '32回') should have monthly_lesson_limit = 2, max_rollover_limit = 1.
-- Plans with '月4回' (or '4回') should have monthly_lesson_limit = 4, max_rollover_limit = 2.
-- Single/package plans should have monthly_lesson_limit = 0, max_rollover_limit = 0.
-- Alter column default for monthly_lesson_limit from 4 to 0 so new records do not accidentally default to 4.

ALTER TABLE public.membership_types 
ALTER COLUMN monthly_lesson_limit SET DEFAULT 0;

-- 1. 2-times plans (handles half-width and full-width)
UPDATE public.membership_types
SET monthly_lesson_limit = 2, max_rollover_limit = 1
WHERE (name LIKE '%月2回%' OR name LIKE '%2回%' OR name LIKE '%月２回%' OR name LIKE '%２回%')
  AND name NOT LIKE '%12回%'
  AND name NOT LIKE '%１２回%'
  AND name NOT LIKE '%24回%'
  AND name NOT LIKE '%２４回%'
  AND name NOT LIKE '%32回%'
  AND name NOT LIKE '%３２回%'
  AND is_package = false;

-- 2. 4-times plans (handles half-width and full-width)
UPDATE public.membership_types
SET monthly_lesson_limit = 4, max_rollover_limit = 2
WHERE (name LIKE '%月4回%' OR name LIKE '%4回%' OR name LIKE '%月４回%' OR name LIKE '%４回%')
  AND name NOT LIKE '%14回%'
  AND name NOT LIKE '%１４回%'
  AND name NOT LIKE '%24回%'
  AND name NOT LIKE '%２４回%'
  AND is_package = false;

-- 3. Single / Package plans
UPDATE public.membership_types
SET monthly_lesson_limit = 0, max_rollover_limit = 0
WHERE name LIKE '%単発%' OR is_package = true;

