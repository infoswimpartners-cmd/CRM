-- Add 'immediate_payment_request' template
INSERT INTO email_templates (key, subject, body)
VALUES (
  'immediate_payment_request',
  '【Swim Partners】追加レッスンのお支払いについて',
  '{{student_name}} 様

Swim Partnersをご利用いただきありがとうございます。

以下の追加レッスンの予約を受け付けました。
本レッスンは追加利用となるため、事前の決済をお願いしております。

■ご予約内容
日時: {{date}} {{time}}
レッスン: {{title}}
料金: {{amount}}

下記リンクよりお支払い手続きをお願いいたします。
（お支払いが完了次第、予約確定となります）

▼お支払いページ
{{payment_url}}

ご不明な点がございましたら、お気軽にお問い合わせください。

Swim Partners 事務局'
)
ON CONFLICT (key) DO UPDATE
SET subject = EXCLUDED.subject,
    body = EXCLUDED.body;
