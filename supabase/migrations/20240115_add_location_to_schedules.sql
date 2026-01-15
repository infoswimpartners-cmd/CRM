-- Add missing location column to lesson_schedules
alter table lesson_schedules add column location text;
