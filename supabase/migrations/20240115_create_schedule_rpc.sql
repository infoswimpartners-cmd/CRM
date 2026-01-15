-- RPC to create schedule safely
-- This bypasses client-side RLS quirks by running on the server, but enforces security checks manually.

create or replace function create_schedule(
  p_coach_id uuid,
  p_start_time timestamp with time zone,
  p_end_time timestamp with time zone,
  p_title text,
  p_student_id uuid default null,
  p_location text default null,
  p_notes text default null
)
returns json
language plpgsql
security definer
as $$
declare
  v_new_id uuid;
begin
  -- 1. Security Check: Ensure the caller is the coach or an admin
  if auth.uid() != p_coach_id and not exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
  ) then
     return json_build_object('error', 'Unauthorized: You can only create schedules for yourself');
  end if;

  -- 2. Insert
  insert into lesson_schedules (
    coach_id,
    student_id,
    start_time,
    end_time,
    title,
    location,
    notes
  ) values (
    p_coach_id,
    p_student_id,
    p_start_time,
    p_end_time,
    p_title,
    p_location,
    p_notes
  )
  returning id into v_new_id;

  return json_build_object('success', true, 'id', v_new_id);

exception when others then
  return json_build_object('error', SQLERRM, 'detail', SQLSTATE);
end;
$$;

-- Grant execute
grant execute on function create_schedule to authenticated;
