
-- Function to fetch student lesson history (Bypasses RLS)
drop function if exists get_student_lesson_history_public(uuid);

create or replace function get_student_lesson_history_public(p_student_id uuid)
returns table (
  id uuid,
  lesson_date timestamp with time zone,
  menu_description text,
  price integer,
  coach_full_name text
)
language plpgsql
security definer -- Runs with privileges of the creator
as $$
begin
  return query
  select 
    l.id, 
    l.lesson_date,
    l.menu_description,
    l.price,
    p.full_name as coach_full_name
  from lessons l
  left join profiles p on l.coach_id = p.id
  where l.student_id = p_student_id
  order by l.lesson_date desc;
end;
$$;

-- Grant access to authenticated users
grant execute on function get_student_lesson_history_public(uuid) to authenticated;
