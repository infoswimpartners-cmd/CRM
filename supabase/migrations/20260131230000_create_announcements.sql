-- Create announcements table
create table if not exists announcements (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  priority text default 'normal' check (priority in ('normal', 'high')),
  published_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references auth.users(id) on delete set null
);

-- Enable RLS
alter table announcements enable row level security;

-- Policies
create policy "Everyone can view announcements"
  on announcements for select
  using ( auth.role() = 'authenticated' );

create policy "Admins can insert announcements"
  on announcements for insert
  with check ( exists (select 1 from profiles where id = auth.uid() and role = 'admin') );

create policy "Admins can update announcements"
  on announcements for update
  using ( exists (select 1 from profiles where id = auth.uid() and role = 'admin') );

create policy "Admins can delete announcements"
  on announcements for delete
  using ( exists (select 1 from profiles where id = auth.uid() and role = 'admin') );

-- Seed some initial data
insert into announcements (title, content, priority, published_at)
values 
('振替制度の改定について（重要）', '2026年2月1日より、振替制度が一部変更となります。詳細はマニュアルをご確認ください。', 'high', now()),
('システムアップデートのお知らせ', '本日深夜にシステムメンテナンスを実施します。影響範囲は軽微です。', 'normal', now() - interval '5 days');
