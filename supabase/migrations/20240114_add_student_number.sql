-- Add student_number column to students table
ALTER TABLE students ADD COLUMN student_number text;

-- Optional: Add a unique constraint if desired
-- ALTER TABLE students ADD CONSTRAINT students_student_number_key UNIQUE (student_number);
