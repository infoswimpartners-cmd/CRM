-- Insert Trial Payment Completed Template
INSERT INTO email_templates (key, subject, body, variables, description)
VALUES (
    'trial_payment_completed',
    '【Swim Partners】体験レッスンのお申し込みありがとうございます（決済完了・日程確定）',
    '{{full_name}} 様

Swim Partnersです。
体験レッスンの決済が完了し、以下の日程でご予約が確定いたしました。

■ 体験レッスン日時
{{lesson_date}}

■ 場所
{{location}}

〜 当日について 〜
・開始時間の5分前までにお越しください。
・持ち物: 水着、スイムキャップ、ゴーグル、タオル、飲み物
・体調が優れない場合は無理をせず、前日までにご連絡ください。

当日お会いできることをコーチ一同楽しみにしております。

--------------------------------------------------
Swim Partners
Web: https://swim-partners.com
Mail: info@swim-partners.com
--------------------------------------------------',
    ARRAY['full_name', 'lesson_date', 'location'],
    '体験レッスンの決済完了時に送信される自動メール'
)
ON CONFLICT (key) DO UPDATE SET
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    variables = EXCLUDED.variables,
    description = EXCLUDED.description;
