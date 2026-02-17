-- Add default company info (if not exists) to ensure payment slips have data immediately
INSERT INTO app_configs (key, value, description)
VALUES 
    ('company_name', 'SWIM PARTNERS', '会社名'),
    ('company_address', '東京都', '会社住所'),
    ('invoice_registration_number', '', 'インボイス登録番号'),
    ('contact_email', 'support@swim-partners.com', '連絡先メールアドレス'),
    ('company_payment_bank_name', '三井住友銀行', '振込元銀行名')
ON CONFLICT (key) DO NOTHING;
