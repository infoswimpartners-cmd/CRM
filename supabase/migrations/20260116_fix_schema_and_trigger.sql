-- 1. Relax username constraints if they exist and are strict
alter table public.profiles drop constraint if exists username_length;
-- Ensure username is nullable (it should be, but just in case)
alter table public.profiles alter column username drop not null;

-- 2. Make handle_new_user robust with ON CONFLICT (idempotent)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'coach')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role;
  return new;
exception
  when others then
    -- Log error (visible in Supabase logs) but don't block user creation if strictly needed? 
    -- No, we need profile. Better to raise exception but maybe simplified.
    raise exception 'Failed to create profile: %', SQLERRM;
end;
$$ language plpgsql security definer;

-- 3. Re-bind Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
