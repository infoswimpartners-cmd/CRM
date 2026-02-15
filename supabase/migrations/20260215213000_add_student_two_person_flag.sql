-- Add is_two_person_lesson flag to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_two_person_lesson boolean DEFAULT false;

COMMENT ON COLUMN students.is_two_person_lesson IS 'If true, this student takes 2-person simultaneous lessons, and the coach reward is increased by 1000 JPY/lesson.';
