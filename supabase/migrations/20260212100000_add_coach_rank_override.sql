-- Add override_coach_rank column to profiles table
ALTER TABLE public.profiles
ADD COLUMN if not exists override_coach_rank double precision;

-- Comment for documentation
COMMENT ON COLUMN public.profiles.override_coach_rank IS 'Manually overridden coach rank (e.g., 0.70). If null, auto-calculation applies.';
