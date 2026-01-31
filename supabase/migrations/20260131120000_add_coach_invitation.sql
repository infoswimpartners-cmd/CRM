-- Add invitation fields to profiles table

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS invitation_token text UNIQUE,
ADD COLUMN IF NOT EXISTS invitation_expires_at timestamptz;

-- Mark all existing profiles as 'active' since they are already using the system
UPDATE profiles SET status = 'active' WHERE status = 'pending' OR status IS NULL;
