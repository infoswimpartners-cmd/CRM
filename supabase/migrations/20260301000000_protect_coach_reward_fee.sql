-- =========================================================================
-- Protect distant_reward_fee from being updated by coaches themselves
-- =========================================================================

-- Create a trigger function that prevents non-admins from changing protected profile fields
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_user_role text;
BEGIN
    -- Get the role of the user performing the update
    SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();

    -- If the user is NOT an admin, they cannot change their distant_reward_fee (or role)
    IF v_user_role IS DISTINCT FROM 'admin' THEN
        -- Revert distant_reward_fee to its OLD value
        NEW.distant_reward_fee := OLD.distant_reward_fee;
        
        -- Also protect the role field while we're at it, so coaches can't make themselves admins
        NEW.role := OLD.role;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it already exists
DROP TRIGGER IF EXISTS protect_profile_fields_trigger ON profiles;

-- Create the trigger on the profiles table
CREATE TRIGGER protect_profile_fields_trigger
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION protect_profile_fields();
