-- Create ticket_transactions table
create table if not exists ticket_transactions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  student_id uuid references students(id) on delete cascade not null,
  change_amount integer not null,
  balance_after integer not null,
  reason text not null, -- 'purchase', 'lesson_usage', 'admin_adjustment', 'expiration'
  related_id uuid -- foreign key to payments or lessons (polymorphic-ish)
);

-- Enable RLS for ticket_transactions
alter table ticket_transactions enable row level security;

-- Policies for ticket_transactions
create policy "Students can view own ticket transactions"
  on ticket_transactions for select
  using (
    exists (
      select 1 from students
      where students.id = ticket_transactions.student_id
      and students.auth_user_id = auth.uid()
    )
  );

create policy "Admins can view all ticket transactions"
  on ticket_transactions for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Create notifications table
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  student_id uuid references students(id) on delete cascade not null,
  title text not null,
  body text,
  action_url text,
  is_read boolean default false not null,
  type text default 'info' -- 'info', 'alert', 'success'
);

-- Enable RLS for notifications
alter table notifications enable row level security;

-- Policies for notifications
create policy "Students can view own notifications"
  on notifications for select
  using (
    exists (
      select 1 from students
      where students.id = notifications.student_id
      and students.auth_user_id = auth.uid()
    )
  );

create policy "Students can update own notifications (mark as read)"
  on notifications for update
  using (
    exists (
      select 1 from students
      where students.id = notifications.student_id
      and students.auth_user_id = auth.uid()
    )
  );

-- Grant permissions (if needed for authenticated role, usually RLS handles it but good to be explicit for public schema if not default)
grant select on ticket_transactions to authenticated;
grant select, update on notifications to authenticated;
