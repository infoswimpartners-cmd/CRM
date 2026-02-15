-- Enable Realtime for specific tables
begin;
  -- Remove existing if any (to avoid duplicates)
  alter publication supabase_realtime drop table if exists lesson_schedules;
  alter publication supabase_realtime drop table if exists lessons;

  -- Add tables to the realtime publication
  alter publication supabase_realtime add table lesson_schedules;
  alter publication supabase_realtime add table lessons;
commit;
