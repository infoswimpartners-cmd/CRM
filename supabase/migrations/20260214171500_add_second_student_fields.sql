-- 2人目の生徒用の性別と生年月日のカラムを追加
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS second_student_gender text,
ADD COLUMN IF NOT EXISTS second_student_birth_date date;
