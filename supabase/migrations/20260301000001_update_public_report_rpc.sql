-- Drop old version
DROP FUNCTION IF EXISTS submit_lesson_report_public(uuid, uuid, text, timestamp with time zone, text, uuid, integer, text);

-- Create new version with additional parameters
CREATE OR REPLACE FUNCTION submit_lesson_report_public(
  p_coach_id uuid,
  p_student_id uuid,
  p_student_name text,
  p_lesson_date timestamp with time zone,
  p_description text,
  p_lesson_master_id uuid,
  p_price integer,
  p_location text,
  p_feedback_good text DEFAULT '',
  p_feedback_next text DEFAULT '',
  p_coach_comment text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_id uuid;
BEGIN
  INSERT INTO lessons (
    coach_id,
    student_id,
    lesson_date,
    menu_description,
    lesson_master_id,
    price,
    student_name,
    location,
    feedback_good,
    feedback_next,
    coach_comment
  ) VALUES (
    p_coach_id,
    p_student_id,
    p_lesson_date,
    p_description,
    p_lesson_master_id,
    p_price,
    p_student_name,
    p_location,
    p_feedback_good,
    p_feedback_next,
    p_coach_comment
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- Grant access to public (anon)
GRANT EXECUTE ON FUNCTION submit_lesson_report_public TO anon;
GRANT EXECUTE ON FUNCTION submit_lesson_report_public TO authenticated;
