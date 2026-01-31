create table if not exists coach_invitations (
  id uuid default gen_random_uuid() primary key,
  token text unique not null,
  is_used boolean default false not null,
  expires_at timestamptz not null,
  created_at timestamptz default now() not null,
  created_by uuid references auth.users(id) on delete set null
);

-- RLS policies
alter table coach_invitations enable row level security;

-- Admins can view and create invitations
create policy "Admins can view invitations"
  on coach_invitations for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can insert invitations"
  on coach_invitations for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Public (unauthenticated) needs to read invitations to verify token validity, but restrict by token equality
-- Actually, better to just use Admin Client on backend to verify token for Signup,
-- so we don't need public read access. Secure by default.
