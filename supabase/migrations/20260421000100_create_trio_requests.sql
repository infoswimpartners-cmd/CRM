-- trio_lesson_requests テーブルの作成
CREATE TABLE IF NOT EXISTS public.trio_lesson_requests (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    preferred_date date,
    preferred_time_slot text, -- 'morning', 'afternoon', 'evening' など
    message text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'noted', 'responded'))
);

-- RLS の設定
ALTER TABLE public.trio_lesson_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and create their own requests" ON public.trio_lesson_requests
    FOR ALL TO authenticated
    USING (student_id IN (
        SELECT id FROM students WHERE auth_user_id = auth.uid()
    ))
    WITH CHECK (student_id IN (
        SELECT id FROM students WHERE auth_user_id = auth.uid()
    ));

CREATE POLICY "Admins can manage all lesson requests" ON public.trio_lesson_requests
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 最近のリクエスト取得用インデックス
CREATE INDEX IF NOT EXISTS trio_lesson_requests_student_id_idx ON public.trio_lesson_requests(student_id);
CREATE INDEX IF NOT EXISTS trio_lesson_requests_created_at_idx ON public.trio_lesson_requests(created_at);
