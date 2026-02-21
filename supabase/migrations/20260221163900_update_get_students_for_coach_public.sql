-- Modify get_students_for_coach_public to include students assigned via student_coaches table
CREATE OR REPLACE FUNCTION get_students_for_coach_public(p_coach_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  default_master_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    s.id, 
    s.full_name,
    m.default_lesson_master_id
  FROM students s
  LEFT JOIN membership_types m ON s.membership_type_id = m.id
  LEFT JOIN student_coaches sc ON s.id = sc.student_id
  WHERE (s.coach_id = p_coach_id OR sc.coach_id = p_coach_id);
END;
$$;
