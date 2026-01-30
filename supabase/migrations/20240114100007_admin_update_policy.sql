-- Allow admins to update any profile
create policy "Admins can update any profile" on profiles
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
