-- ==============================================================================
-- Migration: 20260930120000_line_marketing_system.sql
-- Description: LINEマーケティングシステム（セグメント一括配信・体験後ステップ配信・配信ログ）
-- Non-destructive: 既存テーブルを一切変更せず、新規テーブル4つを追加
-- ==============================================================================

-- 1. updated_at 自動更新関数の定義（存在しない場合のみ作成）
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- Table 1: line_broadcast_campaigns (セグメント一括配信キャンペーン管理)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.line_broadcast_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    title TEXT NOT NULL,
    message_text TEXT NOT NULL DEFAULT '',
    message_template TEXT NOT NULL DEFAULT '',
    filter_conditions JSONB DEFAULT '{}'::jsonb NOT NULL,
    target_count INTEGER DEFAULT 0 NOT NULL,
    sent_count INTEGER DEFAULT 0 NOT NULL,
    success_count INTEGER DEFAULT 0 NOT NULL,
    failed_count INTEGER DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled')),
    scheduled_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT
);

-- Table 1 Indexes
CREATE INDEX IF NOT EXISTS idx_line_broadcast_campaigns_status ON public.line_broadcast_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_line_broadcast_campaigns_scheduled_at ON public.line_broadcast_campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_line_broadcast_campaigns_created_at ON public.line_broadcast_campaigns(created_at DESC);

-- Table 1 Trigger
DROP TRIGGER IF EXISTS trg_line_broadcast_campaigns_updated_at ON public.line_broadcast_campaigns;
CREATE TRIGGER trg_line_broadcast_campaigns_updated_at
    BEFORE UPDATE ON public.line_broadcast_campaigns
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table 1 RLS
ALTER TABLE public.line_broadcast_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on line_broadcast_campaigns" ON public.line_broadcast_campaigns;
CREATE POLICY "Service role full access on line_broadcast_campaigns"
    ON public.line_broadcast_campaigns FOR ALL TO service_role
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins full access on line_broadcast_campaigns" ON public.line_broadcast_campaigns;
CREATE POLICY "Admins full access on line_broadcast_campaigns"
    ON public.line_broadcast_campaigns FOR ALL TO authenticated
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

-- ==============================================================================
-- Table 2: line_step_rules (体験後ステップ配信シナリオ・ステップカード定義)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.line_step_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    step_order INTEGER NOT NULL,
    title TEXT NOT NULL,
    delay_days INTEGER DEFAULT 1 NOT NULL CHECK (delay_days >= 0),
    send_time TEXT DEFAULT '19:00' NOT NULL CHECK (send_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
    message_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Table 2 Indexes
CREATE INDEX IF NOT EXISTS idx_line_step_rules_step_order ON public.line_step_rules(step_order ASC);
CREATE INDEX IF NOT EXISTS idx_line_step_rules_is_active ON public.line_step_rules(is_active);

-- Table 2 Trigger
DROP TRIGGER IF EXISTS trg_line_step_rules_updated_at ON public.line_step_rules;
CREATE TRIGGER trg_line_step_rules_updated_at
    BEFORE UPDATE ON public.line_step_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table 2 RLS
ALTER TABLE public.line_step_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on line_step_rules" ON public.line_step_rules;
CREATE POLICY "Service role full access on line_step_rules"
    ON public.line_step_rules FOR ALL TO service_role
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins full access on line_step_rules" ON public.line_step_rules;
CREATE POLICY "Admins full access on line_step_rules"
    ON public.line_step_rules FOR ALL TO authenticated
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

-- Table 2 初期シードデータ投入（体験受講後の3ステップ推奨シナリオ）
INSERT INTO public.line_step_rules (step_order, title, delay_days, send_time, message_text, is_active)
SELECT 1, '1日後 19:00: 体験受講のお礼と感想のお伺い', 1, '19:00',
'{{name}} 様、昨日はSwim Partnersの体験レッスンをご受講いただき誠にありがとうございました！🏊‍♂️✨

お子様の泳ぎやレッスンのご様子はいかがでしたでしょうか？
「楽しかった！」「また行きたい！」などのお声がございましたら大変嬉しく思います。

ご質問や気になる点がございましたら、いつでもこのLINEチャットへ直接ご返信くださいね😊', true
WHERE NOT EXISTS (SELECT 1 FROM public.line_step_rules WHERE step_order = 1);

INSERT INTO public.line_step_rules (step_order, title, delay_days, send_time, message_text, is_active)
SELECT 2, '3日後 12:00: 担当コーチからのフィードバック＆上達プラン', 3, '12:00',
'{{name}} 様、こんにちは！Swim Partners事務局です✨

体験レッスンでのお子様の泳ぎの癖や成長ポイントをもとに、今後の上達ステップをご案内いたします。
マンツーマン個別指導だからこそ、一人ひとりのペースに合わせて最短距離で目標を達成できます！

▼ 本会員へのご入会・プランのご確認はこちらから
https://manager.swim-partners.com/enroll', true
WHERE NOT EXISTS (SELECT 1 FROM public.line_step_rules WHERE step_order = 2);

INSERT INTO public.line_step_rules (step_order, title, delay_days, send_time, message_text, is_active)
SELECT 3, '7日後 19:00: 体験受講者限定の入会特典・特別案内', 7, '19:00',
'{{name}} 様、体験レッスンから1週間が経ちましたがいかがお過ごしでしょうか？💡

体験受講者様限定で、今週中のお申し込みで初月特典が適用されるキャンペーンを実施中です。
ご希望の日程やコーチのご相談など、お気軽にチャットにてお聞かせください！', true
WHERE NOT EXISTS (SELECT 1 FROM public.line_step_rules WHERE step_order = 3);

-- ==============================================================================
-- Table 3: line_step_student_progress (生徒別ステップ配信進行状態管理)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.line_step_student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    line_user_id TEXT,
    trial_completed_at TIMESTAMPTZ,
    current_step_order INTEGER DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'in_progress' NOT NULL CHECK (status IN ('in_progress', 'sending', 'completed', 'skipped', 'stopped')),
    trigger_date DATE DEFAULT CURRENT_DATE NOT NULL,
    last_sent_at TIMESTAMPTZ,
    next_scheduled_at TIMESTAMPTZ,
    stop_reason TEXT,
    skip_reason TEXT,
    CONSTRAINT unique_line_step_student UNIQUE (student_id)
);

-- Table 3 Indexes
CREATE INDEX IF NOT EXISTS idx_line_step_progress_student_id ON public.line_step_student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_line_step_progress_status_next_scheduled ON public.line_step_student_progress(status, next_scheduled_at);
CREATE INDEX IF NOT EXISTS idx_line_step_progress_trigger_date ON public.line_step_student_progress(trigger_date);

-- Table 3 Trigger
DROP TRIGGER IF EXISTS trg_line_step_student_progress_updated_at ON public.line_step_student_progress;
CREATE TRIGGER trg_line_step_student_progress_updated_at
    BEFORE UPDATE ON public.line_step_student_progress
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table 3 RLS
ALTER TABLE public.line_step_student_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on line_step_student_progress" ON public.line_step_student_progress;
CREATE POLICY "Service role full access on line_step_student_progress"
    ON public.line_step_student_progress FOR ALL TO service_role
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins full access on line_step_student_progress" ON public.line_step_student_progress;
CREATE POLICY "Admins full access on line_step_student_progress"
    ON public.line_step_student_progress FOR ALL TO authenticated
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

-- ==============================================================================
-- Table 4: line_delivery_logs (LINE配信ログ・トラッキング)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.line_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    delivery_type TEXT NOT NULL CHECK (delivery_type IN ('broadcast', 'step_message', 'test_preview')),
    campaign_id UUID REFERENCES public.line_broadcast_campaigns(id) ON DELETE SET NULL,
    step_id UUID REFERENCES public.line_step_rules(id) ON DELETE SET NULL,
    step_name TEXT,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    student_number TEXT,
    student_name TEXT,
    line_user_id TEXT NOT NULL,
    message_body TEXT NOT NULL DEFAULT '',
    rendered_message TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('sent', 'success', 'failed', 'skipped')),
    error_message TEXT,
    response_status_code INTEGER,
    line_request_id TEXT,
    is_test_preview BOOLEAN DEFAULT false NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table 4 Indexes
CREATE INDEX IF NOT EXISTS idx_line_delivery_logs_delivery_type ON public.line_delivery_logs(delivery_type);
CREATE INDEX IF NOT EXISTS idx_line_delivery_logs_status ON public.line_delivery_logs(status);
CREATE INDEX IF NOT EXISTS idx_line_delivery_logs_sent_at ON public.line_delivery_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_line_delivery_logs_student_id ON public.line_delivery_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_line_delivery_logs_campaign_id ON public.line_delivery_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_line_delivery_logs_is_test_preview ON public.line_delivery_logs(is_test_preview);

-- Table 4 RLS
ALTER TABLE public.line_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on line_delivery_logs" ON public.line_delivery_logs;
CREATE POLICY "Service role full access on line_delivery_logs"
    ON public.line_delivery_logs FOR ALL TO service_role
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins full access on line_delivery_logs" ON public.line_delivery_logs;
CREATE POLICY "Admins full access on line_delivery_logs"
    ON public.line_delivery_logs FOR ALL TO authenticated
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
