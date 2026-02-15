-- Drop old view policy
drop policy if exists "Coaches can view their own lessons" on lessons;

-- Create enhanced view policy for coaches
-- Allows coaches to view their own lessons OR lessons of students they are assigned to
create policy "Coaches can view assigned student lessons" on lessons
    for select using (
        (select auth.uid()) = coach_id 
        OR 
        exists (
            select 1 from student_coaches 
            where student_coaches.student_id = lessons.student_id 
            and student_coaches.coach_id = (select auth.uid())
        )
    );
