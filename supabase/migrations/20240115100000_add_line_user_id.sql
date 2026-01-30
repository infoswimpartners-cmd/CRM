-- Add line_user_id to students table
alter table students add column line_user_id text;

-- Optional: Index for faster lookups (though table likely small)
create index students_line_user_id_idx on students(line_user_id);
