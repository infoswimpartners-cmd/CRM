
INSERT INTO public.email_templates (key, subject, body)
VALUES (
    'admin_daily_billing_summary',
    '【Swim Partners】明日の請求実行予定サマリー',
    '管理者様

Swim Partnersシステムです。

明日、以下の請求処理が実行される予定です。

【実行予定日】
{{date}}

【件数】
{{count}}件

【合計金額】
{{total_amount}}

【内訳】
{{items_list}}

※これらは既に「承認済み」の案件です。明日の正午頃にStripe決済および請求書送付が行われます。
未承認の案件は含まれていません。

Swim Partners System'
)
ON CONFLICT (key) DO UPDATE SET
    subject = EXCLUDED.subject,
    body = EXCLUDED.body;
