-- ==============================================================================
-- Migration: 20261020100000_line_chat_messages.sql
-- Description: Lステップ風 1対1個別トーク・チャット履歴管理テーブル (line_chat_messages)
-- Non-destructive: 既存テーブルを破壊せず新規作成および配信種別制約の拡張のみを実施
-- ==============================================================================

-- 1. line_chat_messages (1対1個別チャット送受信メッセージ履歴)
CREATE TABLE IF NOT EXISTS public.line_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    line_user_id TEXT NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    display_name TEXT,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    sender_type TEXT NOT NULL DEFAULT 'user' CHECK (sender_type IN ('user', 'admin', 'system_auto', 'coach')),
    message_type TEXT NOT NULL DEFAULT 'text',
    message_text TEXT NOT NULL DEFAULT '',
    sender_label TEXT,
    is_read BOOLEAN DEFAULT false NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('received', 'sent', 'success', 'failed')),
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_line_chat_messages_line_user_id ON public.line_chat_messages(line_user_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_line_chat_messages_created_at ON public.line_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_line_chat_messages_unread ON public.line_chat_messages(line_user_id, is_read) WHERE direction = 'inbound' AND is_read = false;

-- RLS有効化
ALTER TABLE public.line_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on line_chat_messages" ON public.line_chat_messages;
CREATE POLICY "Service role full access on line_chat_messages"
    ON public.line_chat_messages FOR ALL TO service_role
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins full access on line_chat_messages" ON public.line_chat_messages;
CREATE POLICY "Admins full access on line_chat_messages"
    ON public.line_chat_messages FOR ALL TO authenticated
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

-- 2. line_delivery_logs の delivery_type CHECK制約を安全に拡張（direct_chat, cart_recovery を許可）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'line_delivery_logs'
          AND constraint_name = 'line_delivery_logs_delivery_type_check'
    ) THEN
        ALTER TABLE public.line_delivery_logs DROP CONSTRAINT line_delivery_logs_delivery_type_check;
        ALTER TABLE public.line_delivery_logs ADD CONSTRAINT line_delivery_logs_delivery_type_check
            CHECK (delivery_type IN ('broadcast', 'step_message', 'test_preview', 'cart_recovery', 'direct_chat'));
    END IF;
END $$;
