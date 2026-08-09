-- 1. line_bot_configs に channel_access_token を追加（各コーチの公式LINEからの送信に使用）
ALTER TABLE public.line_bot_configs 
ADD COLUMN IF NOT EXISTS channel_access_token TEXT;

-- 2. lesson_schedules に reminder_sent_at を追加（二重送信防止用）
ALTER TABLE public.lesson_schedules 
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE;
