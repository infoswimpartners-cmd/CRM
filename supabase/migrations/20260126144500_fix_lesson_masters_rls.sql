
-- Enable update policy for lesson_masters
-- Note: Check if policy already exists or just create a new one "Allow Admin Update"

DROP POLICY IF EXISTS "Allow Admin Update Lesson Masters" ON public.lesson_masters;

CREATE POLICY "Allow Admin Update Lesson Masters"
ON public.lesson_masters
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Ensure Insert is also allowed (if not already)
DROP POLICY IF EXISTS "Allow Admin Insert Lesson Masters" ON public.lesson_masters;
CREATE POLICY "Allow Admin Insert Lesson Masters"
ON public.lesson_masters
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
