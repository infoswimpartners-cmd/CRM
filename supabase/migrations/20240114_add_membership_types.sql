-- Create membership_types table
create table membership_types (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  name text not null,
  fee integer not null default 0,
  active boolean default true not null,
  default_lesson_master_id uuid references lesson_masters(id)
);

-- RLS for membership_types
alter table membership_types enable row level security;

create policy "Admins can manage membership types" on membership_types
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

create policy "Authenticated users can view active membership types" on membership_types
  for select using (active = true);

-- Add membership_type_id to students
alter table students add column membership_type_id uuid references membership_types(id);
