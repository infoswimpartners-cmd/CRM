-- Create lesson_schedules table
create table lesson_schedules (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  coach_id uuid references profiles(id) not null,
  student_id uuid references students(id), -- Optional, checking availability vs booked lesson
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  title text, -- Display title
  notes text
);

-- Enable RLS
alter table lesson_schedules enable row level security;

-- Policies

-- 1. Coaches can view their own schedules
create policy "Coaches can view own schedules" on lesson_schedules
  for select using (
    (select auth.uid()) = coach_id
  );

-- 2. Coaches can insert their own schedules
create policy "Coaches can insert own schedules" on lesson_schedules
  for insert with check (
    (select auth.uid()) = coach_id
  );

-- 3. Coaches can update their own schedules
create policy "Coaches can update own schedules" on lesson_schedules
  for update using (
    (select auth.uid()) = coach_id
  );

-- 4. Coaches can delete their own schedules
create policy "Coaches can delete own schedules" on lesson_schedules
  for delete using (
    (select auth.uid()) = coach_id
  );

-- 5. Admins can view ALL schedules
create policy "Admins can view all schedules" on lesson_schedules
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
    )
  );

-- 6. Admins can insert/update/delete ALL schedules (Optional, but user said "check" everything, implies management too usually)
-- Let's allow full management for Admins to be safe and helpful.

create policy "Admins can insert all schedules" on lesson_schedules
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
    )
  );

create policy "Admins can update all schedules" on lesson_schedules
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
    )
  );

create policy "Admins can delete all schedules" on lesson_schedules
  for delete using (
    exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
    )
  );
