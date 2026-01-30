-- Allow coaches to update their own lessons
create policy "Coaches can update their own lessons" on lessons
    for update using ((select auth.uid()) = coach_id);

-- Allow coaches to delete their own lessons
create policy "Coaches can delete their own lessons" on lessons
    for delete using ((select auth.uid()) = coach_id);
