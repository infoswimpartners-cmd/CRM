-- Add index for Coach Lesson History queries (filtering by coach and sorting by date)
CREATE INDEX IF NOT EXISTS idx_lessons_coach_date ON lessons(coach_id, lesson_date DESC);

-- Add index for looking up lessons by student
CREATE INDEX IF NOT EXISTS idx_lessons_student_id ON lessons(student_id);

-- Add index for looking up lessons by master (less critical but good practice)
CREATE INDEX IF NOT EXISTS idx_lessons_master_id ON lessons(lesson_master_id);

-- Add index for looking up counseling sheets by student
CREATE INDEX IF NOT EXISTS idx_counseling_sheets_student_id ON counseling_sheets(student_id);

-- Add index for looking up students by coach
CREATE INDEX IF NOT EXISTS idx_students_coach_id ON students(coach_id);
