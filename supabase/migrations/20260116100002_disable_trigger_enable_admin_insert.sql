-- 1. DROP the problematic trigger entirely to prevent DB 500 errors
-- This moves control to the Application Server (Next.js)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Grant Admins permission to INSERT new profiles manually
-- (Previously only 'update' was allowed for admins)
CREATE POLICY "Admins can insert any profile" ON profiles
    FOR INSERT WITH CHECK (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );
