-- Update function to include status
drop function if exists get_students_for_coach_public(uuid);

create or replace function get_students_for_coach_public(p_coach_id uuid)
returns table (
  id uuid,
  full_name text,
  default_master_id uuid,
  status text
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    s.id, 
    s.full_name,
    m.default_lesson_master_id,
    s.status
  from students s
  left join membership_types m on s.membership_type_id = m.id
  where s.coach_id = p_coach_id;
end;
$$;
