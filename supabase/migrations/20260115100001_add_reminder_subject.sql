-- Insert default reminder subject
insert into app_configs (key, value, description)
values (
  'reminder_email_subject', 
  '【Swim Partners】明日のレッスン予約のリマインド',
  'レッスンのリマインドメールの件名'
) on conflict do nothing;
