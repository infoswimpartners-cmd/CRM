-- Function to fetch students for a specific coach (Public)
drop function if exists get_students_for_coach_public(uuid);

create or replace function get_students_for_coach_public(p_coach_id uuid)
returns table (
  id uuid,
  full_name text,
  default_master_id uuid
)
language plpgsql
security definer -- Runs with privileges of the creator (postgres/admin)
as $$
begin
  return query
  select 
    s.id, 
    s.full_name,
    m.default_lesson_master_id
  from students s
  left join membership_types m on s.membership_type_id = m.id
  where s.coach_id = p_coach_id;
end;
$$;

-- Function to submit a lesson report (Public)
-- Function to submit a lesson report (Public)
drop function if exists submit_lesson_report_public(uuid, uuid, timestamp with time zone, text, uuid, integer);

create or replace function submit_lesson_report_public(
  p_coach_id uuid,
  p_student_id uuid,
  p_student_name text,
  p_lesson_date timestamp with time zone,
  p_description text,
  p_lesson_master_id uuid,
  p_price integer,
  p_location text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_new_id uuid;
begin
  insert into lessons (
    coach_id,
    student_id,
    lesson_date,
    menu_description,
    lesson_master_id,
    price,
    student_name,
    location
  ) values (
    p_coach_id,
    p_student_id,
    p_lesson_date,
    p_description,
    p_lesson_master_id,
    p_price,
    p_student_name,
    p_location
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

-- Grant access to public (anon)
grant execute on function get_students_for_coach_public(uuid) to anon;
grant execute on function submit_lesson_report_public(uuid, uuid, timestamp with time zone, text, uuid, integer) to anon;
grant execute on function get_students_for_coach_public(uuid) to authenticated;
grant execute on function submit_lesson_report_public(uuid, uuid, timestamp with time zone, text, uuid, integer) to authenticated;
