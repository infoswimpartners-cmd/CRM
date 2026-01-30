
INSERT INTO public.email_templates (key, subject, body)
VALUES (
    'admin_billing_approval_request',
    '【承認依頼】追加請求が発生しました（{{student_name}}様）',
    '管理者 様

お疲れ様です。事務局（または担当者名）です。

以下の通り、規定回数を超過したレッスンの追加請求が発生いたしました。
内容をご確認いただき、承認手続きをお願いいただけますでしょうか。

【請求概要】

対象生徒：{{student_name}}様

レッスン日時： {{date}} {{time}}

請求金額： {{amount}}

請求理由： {{reason}}

【承認手続き】
以下のURLより詳細を確認のうえ、承認をお願いいたします。
{{approval_url}}

※承認完了後、Stripeにて自動決済が実行されます。

ご確認のほど、よろしくお願いいたします。'
)
ON CONFLICT (key) DO UPDATE SET
    subject = EXCLUDED.subject,
    body = EXCLUDED.body;
