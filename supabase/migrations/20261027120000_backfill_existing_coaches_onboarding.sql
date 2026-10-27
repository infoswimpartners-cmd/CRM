-- 既存コーチのアカウント救済用マイグレーション
-- 必要なカラムを安全に追加した上で、現在登録されている既存コーチの onboarding_completed_at を完了日時に更新します。

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_chat_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;

UPDATE profiles
SET onboarding_completed_at = COALESCE(onboarding_completed_at, NOW())
WHERE role = 'coach';
