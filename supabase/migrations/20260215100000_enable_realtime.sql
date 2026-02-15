DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'lesson_schedules') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE lesson_schedules;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'lessons') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE lessons;
  END IF;
END
$$;
