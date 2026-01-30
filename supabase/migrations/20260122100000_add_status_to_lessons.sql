-- Add status column to lessons table
alter table lessons add column status text default 'scheduled';
