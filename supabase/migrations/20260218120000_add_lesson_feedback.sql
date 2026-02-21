-- Add feedback fields to lessons for reports
alter table lessons add column if not exists feedback_good text;
alter table lessons add column if not exists feedback_next text;
