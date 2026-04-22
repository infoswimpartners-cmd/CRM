-- trio_waitlists テーブルの作成
CREATE TABLE IF NOT EXISTS public.trio_waitlists (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    email text NOT NULL,
    line_user_id text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'enrolled', 'cancelled'))
);

-- RLS
ALTER TABLE public.trio_waitlists ENABLE ROW LEVEL SECURITY;

-- 管理者はすべて操作可能
CREATE POLICY "Admins can manage trio_waitlists" ON public.trio_waitlists
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- パブリックな登録を許可 (認証なしでも登録可能にする場合)
CREATE POLICY "Anyone can register to waitlist" ON public.trio_waitlists
    FOR INSERT TO public
    WITH CHECK (true);

-- インデックス
CREATE INDEX IF NOT EXISTS trio_waitlists_created_at_idx ON public.trio_waitlists(created_at);
