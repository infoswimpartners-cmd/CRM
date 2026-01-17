
create table if not exists membership_type_lessons (
    id uuid default gen_random_uuid() primary key,
    membership_type_id uuid references membership_types(id) on delete cascade not null,
    lesson_master_id uuid references lesson_masters(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(membership_type_id, lesson_master_id)
);

-- RLS Policies
alter table membership_type_lessons enable row level security;

create policy "Enable read access for all users"
on membership_type_lessons for select
using (true);

create policy "Enable insert for authenticated users only"
on membership_type_lessons for insert
to authenticated
with check ( true );

create policy "Enable delete for authenticated users only"
on membership_type_lessons for delete
to authenticated
using ( true );

-- Initial data migration (optional: migrate existing defaults)
-- insert into membership_type_lessons (membership_type_id, lesson_master_id)
-- select id, default_lesson_master_id from membership_types where default_lesson_master_id is not null;
