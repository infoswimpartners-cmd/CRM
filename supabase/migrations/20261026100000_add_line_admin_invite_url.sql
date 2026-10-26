-- profiles および coach_invitations テーブルに line_admin_invite_url を追加

-- 1. profiles テーブルにカラム追加
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS line_admin_invite_url TEXT;

-- 2. coach_invitations テーブルにカラム追加
ALTER TABLE coach_invitations 
ADD COLUMN IF NOT EXISTS line_admin_invite_url TEXT;
