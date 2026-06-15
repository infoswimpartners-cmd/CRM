-- leads テーブルに案件通知で使用した webhook_id を記録するカラムを追加
ALTER TABLE public.leads ADD COLUMN notification_webhook_id uuid REFERENCES public.google_chat_webhooks(id);
