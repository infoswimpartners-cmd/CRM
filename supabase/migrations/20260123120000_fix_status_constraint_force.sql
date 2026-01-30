-- Drop existing constraint explicitly
alter table students drop constraint if exists students_status_check;

-- Add new constraint with 'trial_confirmed'
alter table students add constraint students_status_check 
check (status in ('inquiry', 'trial_pending', 'trial_confirmed', 'trial_done', 'active', 'resting', 'withdrawn'));
