-- Migration: Add Membership Change Rules and Requests Table
-- Date: 2026-06-22

-- 1. Add fields to membership_types for change rules
ALTER TABLE public.membership_types
ADD COLUMN IF NOT EXISTS min_contract_months INTEGER DEFAULT 2 NOT NULL,
ADD COLUMN IF NOT EXISTS lock_period_months INTEGER DEFAULT 2 NOT NULL;

-- 2. Add field to students for locking change
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS membership_lock_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 3. Create membership_change_requests table
CREATE TABLE IF NOT EXISTS public.membership_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    current_membership_type_id UUID REFERENCES public.membership_types(id) ON DELETE SET NULL,
    requested_membership_type_id UUID REFERENCES public.membership_types(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    note TEXT,
    CONSTRAINT membership_change_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- RLS
ALTER TABLE public.membership_change_requests ENABLE ROW LEVEL SECURITY;

-- Policies for membership_change_requests
CREATE POLICY "Students can view own change requests"
ON public.membership_change_requests
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = membership_change_requests.student_id
        AND (s.auth_user_id = auth.uid() OR s.line_user_id = auth.uid()::text)
    )
);

CREATE POLICY "Students can insert own change requests"
ON public.membership_change_requests
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = membership_change_requests.student_id
        AND (s.auth_user_id = auth.uid() OR s.line_user_id = auth.uid()::text)
    )
);

CREATE POLICY "Admins can manage all change requests"
ON public.membership_change_requests
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
);

-- Grant privileges
GRANT ALL ON public.membership_change_requests TO authenticated;
GRANT ALL ON public.membership_change_requests TO service_role;
