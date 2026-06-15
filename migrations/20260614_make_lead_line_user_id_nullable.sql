-- leads テーブルの line_user_id を nullable に変更する
ALTER TABLE public.leads ALTER COLUMN line_user_id DROP NOT NULL;
