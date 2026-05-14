-- 決済完了通知用の新しいトリガーを追加
INSERT INTO public.email_triggers (id, name, description, template_id)
VALUES (
    'trial_payment_completed', 
    '体験レッスンの決済完了時', 
    '体験レッスンの決済が正常に完了した際に送信されます。',
    (SELECT id FROM email_templates WHERE key = 'trial_payment_completed' LIMIT 1)
)
ON CONFLICT (id) DO UPDATE SET
    template_id = EXCLUDED.template_id,
    description = EXCLUDED.description;

-- 既存の trial_lesson_reserved トリガーを「支払い依頼用」として適切なテンプレート（trial_payment_request）に紐付け直す
UPDATE public.email_triggers
SET 
    name = '体験レッスン支払い依頼（日程確定）',
    description = '管理者が体験レッスンの日程を確定し、支払い依頼メールを送る際に使用されます。',
    template_id = (SELECT id FROM email_templates WHERE key = 'trial_payment_request' LIMIT 1)
WHERE id = 'trial_lesson_reserved';
