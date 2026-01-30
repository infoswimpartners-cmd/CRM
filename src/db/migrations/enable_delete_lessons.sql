-- Enable DELETE for admins
create policy "Enable delete for admins"
on "public"."lessons"
for delete
using (
  auth.uid() in (
    select id from profiles where role = 'admin'
  )
);

-- Also ensure coaches can delete their OWN lessons
create policy "Enable delete for own lessons"
on "public"."lessons"
for delete
using (
  auth.uid() = coach_id
);
