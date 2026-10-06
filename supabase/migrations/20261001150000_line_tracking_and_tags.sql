-- ==============================================================================
-- Migration: 20261001150000_line_tracking_and_tags.sql
-- Description: LINE / LIFF アクセストラッキングログおよびユーザータグ管理
-- Non-destructive: 既存テーブルを変更せず新規2テーブルを作成
-- ==============================================================================

-- 1. line_access_logs (LIFF等のアクセスログ・クリック追跡)
CREATE TABLE IF NOT EXISTS public.line_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    line_user_id TEXT,
    display_name TEXT,
    form_type TEXT NOT NULL DEFAULT 'trial',
    referrer_name TEXT,
    page_url TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    user_agent TEXT,
    ip_address TEXT,
    is_converted BOOLEAN DEFAULT false NOT NULL,
    converted_at TIMESTAMPTZ,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL
);

-- line_access_logs インデックス
CREATE INDEX IF NOT EXISTS idx_line_access_logs_line_user_id ON public.line_access_logs(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_access_logs_created_at ON public.line_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_line_access_logs_form_type ON public.line_access_logs(form_type);
CREATE INDEX IF NOT EXISTS idx_line_access_logs_is_converted ON public.line_access_logs(is_converted);

-- line_access_logs RLS
ALTER TABLE public.line_access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on line_access_logs" ON public.line_access_logs;
CREATE POLICY "Service role full access on line_access_logs"
    ON public.line_access_logs FOR ALL TO service_role
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins full access on line_access_logs" ON public.line_access_logs;
CREATE POLICY "Admins full access on line_access_logs"
    ON public.line_access_logs FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 2. line_user_tags (LINEユーザー・生徒別タグ管理)
CREATE TABLE IF NOT EXISTS public.line_user_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    line_user_id TEXT NOT NULL,
    tag_name TEXT NOT NULL,
    tag_category TEXT DEFAULT 'behavior' NOT NULL CHECK (tag_category IN ('behavior', 'status', 'campaign', 'custom')),
    display_name TEXT,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT unique_user_tag UNIQUE (line_user_id, tag_name)
);

-- line_user_tags インデックス
CREATE INDEX IF NOT EXISTS idx_line_user_tags_line_user_id ON public.line_user_tags(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_user_tags_tag_name ON public.line_user_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_line_user_tags_student_id ON public.line_user_tags(student_id);

-- line_user_tags RLS
ALTER TABLE public.line_user_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on line_user_tags" ON public.line_user_tags;
CREATE POLICY "Service role full access on line_user_tags"
    ON public.line_user_tags FOR ALL TO service_role
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins full access on line_user_tags" ON public.line_user_tags;
CREATE POLICY "Admins full access on line_user_tags"
    ON public.line_user_tags FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
