-- Add google_refresh_token to profiles for Calendar Sync
alter table profiles add column if not exists google_refresh_token text;

-- Add google_calendar_id to profiles (optional, to specify which calendar to sync)
alter table profiles add column if not exists google_calendar_id text;
