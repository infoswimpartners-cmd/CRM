
-- Allow admins to update all lessons
create policy "Admins can update all lessons"
  on lessons
  for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Allow admins to delete all lessons
create policy "Admins can delete all lessons"
  on lessons
  for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
