-- Drop role check constraint on student_coaches to allow assigned or future roles
ALTER TABLE public.student_coaches DROP CONSTRAINT IF EXISTS student_coaches_role_check;
