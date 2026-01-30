-- Add coach_number column to profiles table
ALTER TABLE profiles ADD COLUMN coach_number text;

-- Create sequence
CREATE SEQUENCE IF NOT EXISTS coach_number_seq START 1;

-- Function to generate coach number
CREATE OR REPLACE FUNCTION set_coach_number() RETURNS TRIGGER AS $$
BEGIN
    -- Only generate if role is coach and number is not provided
    IF NEW.role = 'coach' AND (NEW.coach_number IS NULL OR NEW.coach_number = '') THEN
        NEW.coach_number := 'C' || LPAD(nextval('coach_number_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_set_coach_number ON profiles;
CREATE TRIGGER trigger_set_coach_number
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION set_coach_number();

-- Backfill existing coaches
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM profiles WHERE role = 'coach' AND coach_number IS NULL LOOP
        UPDATE profiles 
        SET coach_number = 'C' || LPAD(nextval('coach_number_seq')::text, 4, '0')
        WHERE id = r.id;
    END LOOP;
END $$;
