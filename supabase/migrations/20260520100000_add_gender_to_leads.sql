-- leadsテーブルに性別(1人目・2人目)のカラムを追加
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS second_student_gender text;
