-- スイムステップ（城東小学校プール 10月限定少人数クラス）申し込み管理テーブル
CREATE TABLE IF NOT EXISTS swim_step_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- LINE連携情報
    line_user_id TEXT,
    line_display_name TEXT,
    
    -- 保護者情報
    parent_name TEXT NOT NULL,
    parent_kana TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    
    -- お子様情報
    child_name TEXT NOT NULL,
    child_kana TEXT NOT NULL,
    child_age TEXT,
    birth_date DATE,
    
    -- プラン・決済情報
    plan_type TEXT NOT NULL, -- 'single' (6500) | 'double' (12000) | 'full' (22000)
    amount INTEGER NOT NULL,
    payment_status TEXT DEFAULT 'pending' NOT NULL, -- 'pending' | 'paid' | 'canceled'
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    
    -- 希望日程・クラス (JSONB array)
    selected_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- 泳力・お悩み
    swimming_experience TEXT,
    
    -- 規約同意
    terms_agreed BOOLEAN DEFAULT false NOT NULL,
    
    -- 管理用メモ・ステータス
    admin_notes TEXT,
    status TEXT DEFAULT 'confirmed' NOT NULL -- 'confirmed' | 'attended' | 'cancelled'
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_swim_step_bookings_line_user_id ON swim_step_bookings(line_user_id);
CREATE INDEX IF NOT EXISTS idx_swim_step_bookings_payment_status ON swim_step_bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_swim_step_bookings_created_at ON swim_step_bookings(created_at DESC);

-- RLS (Row Level Security) の設定
ALTER TABLE swim_step_bookings ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーがある場合は削除して再作成
DROP POLICY IF EXISTS "Service role full access on swim_step_bookings" ON swim_step_bookings;
CREATE POLICY "Service role full access on swim_step_bookings"
ON swim_step_bookings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert swim_step_bookings" ON swim_step_bookings;
CREATE POLICY "Public can insert swim_step_bookings"
ON swim_step_bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
