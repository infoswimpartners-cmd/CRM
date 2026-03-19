-- 体験レッスン種別ごとにメールテンプレートを紐付けるためのカラム追加
ALTER TABLE lesson_masters 
ADD COLUMN email_template_id UUID REFERENCES email_templates(id);

-- コメント追加 (任意)
COMMENT ON COLUMN lesson_masters.email_template_id IS 'このレッスンが予約された時に送信するメールテンプレートのID';
