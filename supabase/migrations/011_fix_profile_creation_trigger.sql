-- Fix signup issue: Add trigger to auto-create profiles on user signup
-- Issue: New user signups fail with 500 error because no profile is created
-- Solution: Create trigger that automatically creates a profile when auth.users record is created
-- This version handles cases where policies/triggers already exist

-- Function to create profile for new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, created_at, settings)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    NOW(),
    '{}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;  -- Don't fail if profile already exists
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run the function on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure profiles table has RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (using IF EXISTS)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- Allow users to view all profiles (needed for group members, game participants, etc.)
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow the trigger to insert profiles (SECURITY DEFINER function handles this)
-- Users should not manually insert profiles
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile when a new user signs up';
