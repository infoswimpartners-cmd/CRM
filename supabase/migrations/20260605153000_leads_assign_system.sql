-- leadsテーブルにカラムを追加
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lesson_location TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;

-- app_configsに個人情報マスク設定値の初期データを追加
INSERT INTO app_configs (key, value, description)
VALUES (
  'hide_lead_personal_info',
  'true',
  'コーチ用案件紹介ページでリードの個人情報（氏名、電話番号、メールアドレスなど）をマスクするかどうか（true/false）'
)
ON CONFLICT (key) DO NOTHING;

-- コーチが app_configs を参照できるように SELECT ポリシーを追加
CREATE POLICY "Anyone can read app_configs" ON app_configs
  FOR SELECT TO authenticated USING (true);
