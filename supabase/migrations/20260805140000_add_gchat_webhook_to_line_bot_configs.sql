-- line_bot_configs テーブルに特定通知先 Google Chat Webhook の ID を保持するカラムを追加
ALTER TABLE public.line_bot_configs 
ADD COLUMN IF NOT EXISTS gchat_webhook_id UUID REFERENCES public.google_chat_webhooks(id) ON DELETE SET NULL;
