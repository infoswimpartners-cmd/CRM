-- Create line_bot_configs table
create table if not exists line_bot_configs (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references profiles(id) on delete cascade not null,
  bot_id text not null unique,
  bot_name text not null,
  created_at timestamp with time zone default now() not null
);

-- Create line_monitoring_logs table
create table if not exists line_monitoring_logs (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references profiles(id) on delete cascade not null,
  line_user_id text not null,
  line_display_name text,
  message_text text not null,
  direction text not null, -- 'customer_to_coach' or 'coach_to_customer'
  status text default 'unread' not null, -- 'unread', 'checked'
  detected_at timestamp with time zone default now() not null
);

-- Enable Row Level Security (RLS)
alter table line_bot_configs enable row level security;
alter table line_monitoring_logs enable row level security;

-- Policies for line_bot_configs
create policy "Admins can do all on line_bot_configs"
  on line_bot_configs for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Coaches can view their own line_bot_configs"
  on line_bot_configs for select
  using (
    coach_id = auth.uid()
  );

-- Policies for line_monitoring_logs
create policy "Admins can do all on line_monitoring_logs"
  on line_monitoring_logs for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Coaches can view their own line_monitoring_logs"
  on line_monitoring_logs for select
  using (
    coach_id = auth.uid()
  );

create policy "Coaches can update status of their own line_monitoring_logs"
  on line_monitoring_logs for update
  using (
    coach_id = auth.uid()
  );

-- Grant access to authenticated users (coaches and admins)
grant select, insert, update, delete on line_bot_configs to authenticated;
grant select, insert, update, delete on line_monitoring_logs to authenticated;
