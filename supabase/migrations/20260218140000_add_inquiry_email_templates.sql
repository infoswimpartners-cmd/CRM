-- Inquiry Received (To Admin)
INSERT INTO email_templates (key, subject, body)
VALUES (
    'inquiry_received',
    '【Swim Partners】新規のお問い合わせがありました',
    E'管理者様\n\n新しいお問い合わせがありました。\n\n件名: {{subject}}\n送信者: {{user_name}}\n\n管理画面から確認・返信してください。\n{{admin_url}}'
) ON CONFLICT (key) DO UPDATE SET subject = EXCLUDED.subject, body = EXCLUDED.body;

-- Inquiry Replied (To User)
INSERT INTO email_templates (key, subject, body)
VALUES (
    'inquiry_replied',
    '【Swim Partners】お問い合わせへの返信があります',
    E'{{user_name}} 様\n\nお問い合わせ「{{subject}}」について、運営より返信がありました。\n\n以下のリンクから内容をご確認ください。\n{{inquiry_url}}\n\nSwim Partners 運営事務局'
) ON CONFLICT (key) DO UPDATE SET subject = EXCLUDED.subject, body = EXCLUDED.body;
