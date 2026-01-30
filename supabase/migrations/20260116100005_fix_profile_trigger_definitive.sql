-- Definitive fix for Profile Creation
-- 1. Ensure username constraints are gone
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS username_length;
ALTER TABLE public.profiles ALTER COLUMN username DROP NOT NULL;

-- 2. Ensure RLS doesn't block (though Security Definer should verify this)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Simplified Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    -- Handle case where metadata might be missing
    COALESCE(new.raw_user_meta_data->>'full_name', 'No Name'),
    'coach' -- Force coach role initially
  )
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    full_name = excluded.full_name;
    
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Raise formatted exception to help debugging if it still fails
    RAISE EXCEPTION 'Trigger Error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-bind Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
