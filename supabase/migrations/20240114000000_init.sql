-- Create a table for public profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  email text,
  role text default 'coach' check (role in ('admin', 'coach')),

  constraint username_length check (char_length(username) >= 3)
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check ((select auth.uid()) = id);

create policy "Users can update own profile." on profiles
  for update using ((select auth.uid()) = id);

-- Create lessons table
create table lessons (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default now() not null,
    coach_id uuid references profiles(id) not null,
    student_name text not null,
    lesson_date timestamp with time zone not null,
    location text not null,
    menu_description text,
    price integer default 0
);

alter table lessons enable row level security;

create policy "Coaches can insert their own lessons" on lessons
    for insert with check ((select auth.uid()) = coach_id);

create policy "Coaches can view their own lessons" on lessons
    for select using ((select auth.uid()) = coach_id);

create policy "Admins can view all lessons" on lessons
    for select using (
        exists (
            select 1 from profiles
            where profiles.id = (select auth.uid())
            and profiles.role = 'admin'
        )
    );

-- Trigger to handle new user signup
-- This automatically creates a profile entry when a new user signs up via Supabase Auth.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
-- Phase 2: Master Data & CRM

-- 1. Lesson Masters Table
create table lesson_masters (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  name text not null,
  unit_price integer not null default 0,
  active boolean default true not null
);

alter table lesson_masters enable row level security;
-- Admins can do everything
create policy "Admins can manage lesson masters" on lesson_masters
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );
-- Coaches can view active masters
create policy "Coaches can view active lesson masters" on lesson_masters
  for select using (active = true);


-- 2. Students Table
create table students (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  full_name text not null,
  full_name_kana text,
  birth_date date,
  gender text,
  contact_email text,
  contact_phone text,
  emergency_contact text,
  notes text
);

alter table students enable row level security;
-- Everyone (Authenticated) can view/insert/update students for now (Collaborative CRM)
-- You might want to restrict DELETE to admins
create policy "Authenticated users can view students" on students
  for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert students" on students
  for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update students" on students
  for update using (auth.role() = 'authenticated');

-- 3. Counseling Sheets Table
create table counseling_sheets (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  student_id uuid references students(id) on delete cascade not null,
  swimming_experience text,
  goals text,
  health_conditions text
);

alter table counseling_sheets enable row level security;
create policy "Authenticated users can manage counseling sheets" on counseling_sheets
  for all using (auth.role() = 'authenticated');

-- 4. Update Lessons Table
-- We add nullable columns first to support existing data
alter table lessons add column student_id uuid references students(id);
alter table lessons add column lesson_master_id uuid references lesson_masters(id);
-- (Optional) If you want to enforce these in the future, you'd need to migrate existing data first.
-- Phase 3: Coach Management

-- 1. Add coach_id to students table
alter table students add column coach_id uuid references profiles(id);

-- Optional: Create index for performance
create index students_coach_id_idx on students(coach_id);

-- RLS: No changes needed for 'view' if 'Authenticated' is already on.
-- However, if we strictly want only the assigned coach to view *detailed* data, we might change RLS later.
-- For now, the requirement implies openness or at least Admin capability.
-- We keep existing 'Authenticated users can view/update' policy which covers this.
