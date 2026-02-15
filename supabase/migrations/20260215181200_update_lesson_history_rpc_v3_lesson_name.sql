
-- Drop existing function to update return type
DROP FUNCTION IF EXISTS public.get_student_lesson_history_public(uuid);

-- Re-create the function with lesson_name and without price (as per request)
CREATE OR REPLACE FUNCTION public.get_student_lesson_history_public(p_student_id uuid)
RETURNS TABLE (
  id uuid,
  lesson_date timestamp with time zone,
  menu_description text,
  lesson_name text,
  coach_full_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id, 
    l.lesson_date,
    l.menu_description,
    lm.name AS lesson_name,
    p.full_name AS coach_full_name
  FROM public.lessons l
  LEFT JOIN public.profiles p ON l.coach_id = p.id
  LEFT JOIN public.lesson_masters lm ON l.lesson_master_id = lm.id
  WHERE l.student_id = p_student_id
  ORDER BY l.lesson_date DESC;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.get_student_lesson_history_public(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_lesson_history_public(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_lesson_history_public(uuid) TO service_role;
