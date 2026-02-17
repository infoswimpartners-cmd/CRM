-- Add payment slip template configurations
INSERT INTO app_configs (key, value, description)
VALUES 
    ('payment_slip_title', '支払通知書', '支払い通知書のタイトル'),
    ('payment_slip_header_paid', '以下の内容で振込手続が完了いたしました。', '支払い完了時のヘッダー文言'),
    ('payment_slip_header_processing', '以下の内容で支払手続きを進めております。', '支払い処理中のヘッダー文言'),
    ('payment_slip_footer', 'Swim Partners Manager System', '支払い通知書のフッター文言')
ON CONFLICT (key) DO NOTHING;

-- Allow authenticated users to read these configs
CREATE POLICY "Public read payment template configs" ON app_configs
  FOR SELECT
  TO authenticated
  USING (
    key IN (
      'payment_slip_title', 
      'payment_slip_header_paid', 
      'payment_slip_header_processing', 
      'payment_slip_footer'
    )
  );
