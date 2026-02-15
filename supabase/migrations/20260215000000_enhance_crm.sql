-- Add bank transfer flag to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_bank_transfer boolean DEFAULT false;

-- Create junction table for student-coach relationship
CREATE TABLE IF NOT EXISTS student_coaches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    coach_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role text DEFAULT 'main' CHECK (role IN ('main', 'sub')),
    UNIQUE(student_id, coach_id)
);

-- Enable RLS
ALTER TABLE student_coaches ENABLE ROW LEVEL SECURITY;

-- Policies for student_coaches
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_coaches' AND policyname = 'Authenticated users can view student_coaches'
    ) THEN
        CREATE POLICY "Authenticated users can view student_coaches" ON student_coaches FOR SELECT USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_coaches' AND policyname = 'Admins can manage student_coaches'
    ) THEN
        CREATE POLICY "Admins can manage student_coaches" ON student_coaches FOR ALL USING (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
        );
    END IF;
END
$$;

-- Data Migration: Move existing coach_id from students to student_coaches
INSERT INTO student_coaches (student_id, coach_id, role)
SELECT id, coach_id, 'main'
FROM students
WHERE coach_id IS NOT NULL
ON CONFLICT (student_id, coach_id) DO NOTHING;
