-- 1. 不要となった trio_users テーブルの削除
-- trio_entries が依存している可能性があるため CASCADE で削除し、trio_entries自体も作り直す
DROP TABLE IF EXISTS public.trio_entries CASCADE;
DROP TABLE IF EXISTS public.trio_users CASCADE;

-- 2. students テーブルへのカラム追加
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS is_trio boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS trio_ticket_balance integer NOT NULL DEFAULT 0;

-- 3. trio_entries テーブルの再作成 (studentsのIDへの参照に変更)
CREATE TABLE IF NOT EXISTS public.trio_entries (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    slot_id uuid NOT NULL REFERENCES public.trio_slots(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    UNIQUE(slot_id, student_id)
);

-- RLS
ALTER TABLE public.trio_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entries" ON public.trio_entries
    FOR SELECT TO authenticated
    USING (student_id = auth.uid()); -- 実際にはstudentsのどのIDとauth.uidが紐付くかは実装依存だが、既存ロジックに合わせる

CREATE POLICY "Admins can manage trio_entries" ON public.trio_entries
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
