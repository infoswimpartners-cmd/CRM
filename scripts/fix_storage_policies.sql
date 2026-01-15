-- Enable RLS on storage.objects (if not already enabled, usually is)
-- storage.buckets and storage.objects usually have RLS enabled by default in Supabase.

-- 1. Create the bucket if it doesn't exist (Note: Creating buckets via SQL is possible if using the storage schema functions)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- 2. Policy: Allow public viewing of avatars
drop policy if exists "Avatar Public View" on storage.objects;
create policy "Avatar Public View"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- 3. Policy: Allow authenticated users to upload avatars
drop policy if exists "Avatar Upload Auth" on storage.objects;
create policy "Avatar Upload Auth"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  );

-- 4. Policy: Allow users to update their own avatars (or just overwrite generally for now for simplicity)
-- A stricter policy would check the filename or metadata matches user ID, but for this MVP, allowing auth users to update/overwrite in this bucket is acceptable.
drop policy if exists "Avatar Update Auth" on storage.objects;
create policy "Avatar Update Auth"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  );
