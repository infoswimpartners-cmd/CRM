-- profiles テーブルに google_chat_email カラムを追加

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS google_chat_email TEXT;
