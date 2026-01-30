-- Create payouts table
create table if not exists payouts (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references profiles(id) on delete cascade not null,
  amount integer not null check (amount >= 0),
  target_month text not null, -- Format: 'YYYY-MM'
  status text default 'paid' check (status in ('paid', 'pending')),
  paid_at timestamp with time zone default now(),
  note text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table payouts enable row level security;

-- Policies
create policy "Admins can view all payouts"
  on payouts for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Admins can insert payouts"
  on payouts for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Coaches can view their own payouts
create policy "Coaches can view own payouts"
  on payouts for select
  using ( auth.uid() = coach_id );
