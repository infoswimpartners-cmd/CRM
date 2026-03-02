-- 体験申し込みフォーム送信時のトリガーを顧客用・管理者用に分割
-- 既存の trial_form_submitted は顧客（申込者）への自動返信として維持
-- 新規に trial_form_submitted_admin を管理者・コーチへの通知として追加
INSERT INTO public.email_triggers (id, name, description) VALUES
(
    'trial_form_submitted_admin',
    '体験申し込み時 — 管理者・コーチへの通知',
    '体験申し込みフォームが送信された時に、管理者やコーチへ通知します。Google ChatのWebhookと組み合わせてリアルタイム通知にも活用できます。'
)
ON CONFLICT (id) DO NOTHING;
