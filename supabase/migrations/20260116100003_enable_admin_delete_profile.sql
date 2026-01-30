-- Allow Admins to delete profiles
-- Note: This will succeed only if there are no restricting foreign keys (e.g. lessons)
-- or if those FKs align with CASCADE deletions (which we usually avoid for lessons to preserve history).
create policy "Admins can delete any profile" on profiles
  for delete using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
