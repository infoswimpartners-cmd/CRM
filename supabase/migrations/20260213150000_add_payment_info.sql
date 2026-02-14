-- Add bank account info to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS branch_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type text; -- 普通, 当座, etc.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_holder_name text; -- カタカナ

-- Insert default company info into app_configs
INSERT INTO app_configs (key, value, description) VALUES
('company_name', '株式会社スイムテック', '支払通知書の会社名'),
('company_address', '東京都渋谷区神宮前1-1-1', '支払通知書の会社住所'),
('invoice_registration_number', 'T1234567890123', 'インボイス登録番号'),
('contact_email', 'support@swimpartners.jp', '支払通知書の連絡先メールアドレス'),
('company_payment_bank_name', '三井住友銀行 渋谷支店', '支払通知書の振込元銀行名')
ON CONFLICT (key) DO NOTHING;
