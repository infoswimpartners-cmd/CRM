-- Add auth_user_id to students for linking with Supabase Auth
ALTER TABLE students ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id);
CREATE UNIQUE INDEX IF NOT EXISTS students_auth_user_id_idx ON students(auth_user_id);

-- Ensure line_user_id exists (just in case)
ALTER TABLE students ADD COLUMN IF NOT EXISTS line_user_id text;

-- Add current_tickets to students for MVP ticket management
ALTER TABLE students ADD COLUMN IF NOT EXISTS current_tickets integer DEFAULT 0;

-- Ensure status exists in lessons
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS status text DEFAULT 'scheduled';

-- Add google_event_id to lessons for Calendar sync
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS google_event_id text;

-- RLS Policies for Members (Students)
-- Allow students to view their own data
DROP POLICY IF EXISTS "Students can view own profile" ON students;
CREATE POLICY "Students can view own profile" ON students
    FOR SELECT USING (auth.uid() = auth_user_id);

-- Allow students to update own profile (optional for MVP, maybe strictly controlled)
DROP POLICY IF EXISTS "Students can update own profile" ON students;
CREATE POLICY "Students can update own profile" ON students
    FOR UPDATE USING (auth.uid() = auth_user_id);

-- Allow students to view their own lessons
DROP POLICY IF EXISTS "Students can view own lessons" ON lessons;
CREATE POLICY "Students can view own lessons" ON lessons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students
            WHERE students.id = lessons.student_id
            AND students.auth_user_id = auth.uid()
        )
    );
