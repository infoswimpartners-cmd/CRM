-- 既存コーチのアカウント救済用マイグレーション
-- 2026年10月25日 17:00（オンボーディング機能リリース日時）以前に登録された既存コーチについて、
-- onboarding_completed_at が未設定（NULL）のものを created_at にて一括補完し、ログイン時の強制リダイレクトを回避します。

UPDATE profiles
SET onboarding_completed_at = created_at
WHERE role = 'coach'
  AND onboarding_completed_at IS NULL
  AND created_at < '2026-10-25 17:00:00+09';
