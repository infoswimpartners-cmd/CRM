-- コーチ契約同意ログテーブル、プロファイル拡張、およびセキュリティ保護強化

-- 1. profiles テーブルにカラム追加
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. protect_profile_fields トリガー関数の更新（onboarding_completed_at の直接改ざん防止）
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_user_role text;
BEGIN
    -- auth.uid() が NULL の場合（Service Role / バックエンド処理）は変更を許可
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    -- 操作ユーザーのロールを取得
    SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();

    -- 管理者以外は保護対象フィールドの変更を旧値に差し戻す
    IF v_user_role IS DISTINCT FROM 'admin' THEN
        -- 遠方報酬
        NEW.distant_reward_fee := OLD.distant_reward_fee;
        -- ロール
        NEW.role := OLD.role;
        -- オンボーディング完了日時（クライアントからの不正スキップ防止）
        NEW.onboarding_completed_at := OLD.onboarding_completed_at;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー再登録
DROP TRIGGER IF EXISTS protect_profile_fields_trigger ON profiles;
CREATE TRIGGER protect_profile_fields_trigger
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION protect_profile_fields();

-- 3. coach_contracts テーブル作成（契約同意ログ）
CREATE TABLE IF NOT EXISTS coach_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    contract_type TEXT NOT NULL, -- 'basic_agreement'（業務委託基本契約書）, 'compensation_memorandum'（報酬に関する覚書）
    version TEXT NOT NULL DEFAULT '2026-06',
    signer_name TEXT NOT NULL,
    signer_address TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    agreed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_coach_contracts_coach_id ON coach_contracts(coach_id);

-- RLS設定
ALTER TABLE coach_contracts ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーの安全な削除
DROP POLICY IF EXISTS "Coaches can view their own contracts" ON coach_contracts;
DROP POLICY IF EXISTS "Coaches can insert their own contracts" ON coach_contracts;
DROP POLICY IF EXISTS "Admins can view all coach contracts" ON coach_contracts;
DROP POLICY IF EXISTS "Admins can manage coach contracts" ON coach_contracts;

-- 【セキュリティ】閲覧権限のみ付与（INSERT/UPDATE/DELETEはクライアント直接操作を完全遮断し、Service Role経由のみとする）
CREATE POLICY "Coaches can view their own contracts"
ON coach_contracts
FOR SELECT
TO authenticated
USING (auth.uid() = coach_id);

CREATE POLICY "Admins can view all coach contracts"
ON coach_contracts
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- 4. 公開レッスン報告フォーム用の安全なコーチ一覧取得RPC（anonアクセス用）
CREATE OR REPLACE FUNCTION get_public_coaches()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    coach_number TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.full_name, p.coach_number
    FROM profiles p
    WHERE p.role = 'coach'
    ORDER BY p.full_name;
END;
$$;

-- 公開RPCへの実行権限をanonとauthenticatedに付与
GRANT EXECUTE ON FUNCTION get_public_coaches() TO anon, authenticated;

-- 5. profiles のRLSポリシー見直し（anonからの個人情報・トークン漏洩防止）
-- 既存の "Public profiles are viewable by everyone." (using true) を制限
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;

-- 認証済みユーザーのみprofilesを閲覧可能にする
CREATE POLICY "Authenticated users can view profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);
