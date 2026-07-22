-- Add option_reward_fee and option_reward_note to student_coaches table
ALTER TABLE public.student_coaches 
ADD COLUMN IF NOT EXISTS option_reward_fee INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS option_reward_note TEXT;
