
-- Switch to public schema explicitly if needed
SET search_path TO public;

-- Drop function with specific type to be sure
DROP FUNCTION IF EXISTS public.get_student_lesson_history_public(uuid);

-- Re-create the function with explicit public schema
CREATE OR REPLACE FUNCTION public.get_student_lesson_history_public(p_student_id uuid)
RETURNS TABLE (
  id uuid,
  lesson_date timestamp with time zone,
  menu_description text,
  price integer,
  coach_full_name text
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with high privileges
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id, 
    l.lesson_date,
    l.menu_description,
    l.price,
    p.full_name AS coach_full_name
  FROM public.lessons l
  LEFT JOIN public.profiles p ON l.coach_id = p.id
  WHERE l.student_id = p_student_id
  ORDER BY l.lesson_date DESC;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.get_student_lesson_history_public(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_lesson_history_public(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_lesson_history_public(uuid) TO service_role;

-- Verification Query (Run this to confirm)
SELECT proname, proargnames, prosrc 
FROM pg_proc 
WHERE proname = 'get_student_lesson_history_public';
