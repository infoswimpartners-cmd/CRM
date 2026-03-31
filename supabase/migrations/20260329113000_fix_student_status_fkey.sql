-- Remove hardcoded check constraint on students.status
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_status_check;

-- Add foreign key constraint to link students.status to student_statuses.id
ALTER TABLE public.students
  ADD CONSTRAINT students_status_fkey
  FOREIGN KEY (status) REFERENCES public.student_statuses(id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;
