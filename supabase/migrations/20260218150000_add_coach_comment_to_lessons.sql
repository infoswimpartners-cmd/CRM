-- Add coach_comment field to lessons
alter table lessons add column if not exists coach_comment text;
