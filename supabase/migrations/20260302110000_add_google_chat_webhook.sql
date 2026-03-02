-- email_triggersにGoogle Chat Webhook設定カラムを追加
ALTER TABLE public.email_triggers
    ADD COLUMN google_chat_webhook_url TEXT,
    ADD COLUMN google_chat_enabled BOOLEAN DEFAULT false,
    ADD COLUMN google_chat_message_template TEXT;
