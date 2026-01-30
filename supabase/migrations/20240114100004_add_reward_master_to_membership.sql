-- Add reward_master_id to membership_types
-- This column references a lesson_master that should be used as the base for reward calculations
-- instead of the actual lesson price (which might be 0 for monthly members).

ALTER TABLE membership_types 
ADD COLUMN reward_master_id uuid REFERENCES lesson_masters(id);

COMMENT ON COLUMN membership_types.reward_master_id IS 'Lesson Master used as base for reward calculation for this membership type';

-- Reload schema cache
NOTIFY pgrst, 'reload config';
