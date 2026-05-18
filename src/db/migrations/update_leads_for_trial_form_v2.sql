-- 以前のマイグレーションで追加したdatetimeカラムの型を変更し、
-- 新規にレッスン可能曜日のカラムを追加します。

-- TIMESTAMP型からTEXT型へ変更（「2024-05-18 13:00〜17:00」という文字列として保存するため）
-- ※すでにデータが入っている場合エラーになるのを防ぐため、USINGを使って変換します
ALTER TABLE leads
ALTER COLUMN datetime1 TYPE TEXT USING datetime1::TEXT,
ALTER COLUMN datetime2 TYPE TEXT USING datetime2::TEXT,
ALTER COLUMN datetime3 TYPE TEXT USING datetime3::TEXT;

-- 新規カラムの追加
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS available_times TEXT;
