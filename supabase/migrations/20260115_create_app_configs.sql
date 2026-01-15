create table app_configs (
  key text primary key,
  value text,
  description text,
  updated_at timestamp with time zone default now()
);

alter table app_configs enable row level security;

-- Only admins can manage configs
create policy "Admins can manage app_configs" on app_configs
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- Coaches/Public might need read access depending on config?
-- For now, let's keep it restricted to admin unless needed.
-- Wait, reminders are sent via API (server), so server admin client works.
-- If we want to show it? Just admin.

-- Insert default reminder template
insert into app_configs (key, value, description)
values (
  'reminder_email_template', 
  '{{student_name}}様\n\nいつもSwim Partnersをご利用いただきありがとうございます。\n\n明日 {{date}} {{time}}より、{{coach_name}}とのレッスン予約がございます。\n\n当日はお気をつけてお越しください。\nお待ちしております。\n\nSwim Partners',
  'レッスンのリマインドメールのテンプレート。利用可能な変数: {{student_name}}, {{date}}, {{time}}, {{coach_name}}'
);
