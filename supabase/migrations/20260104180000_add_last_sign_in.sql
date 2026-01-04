-- Add last_sign_in_at to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

-- Function to sync last_sign_in_at from auth.users (triggers on profile update or user update)
-- Actually, we need to trigger on auth.users UPDATE.
-- BUT, we cannot easily add triggers to auth.users from here in all environments (sometimes restricted).
-- However, typically in Supabase we can.

-- 1. Create the sync function
CREATE OR REPLACE FUNCTION public.sync_last_sign_in()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update the public profile's last_sign_in_at
    UPDATE public.profiles
    SET last_sign_in_at = NEW.last_sign_in_at
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$;

-- 2. Create the trigger on auth.users
-- Drop if exists first to be safe
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

CREATE TRIGGER on_auth_user_login
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_last_sign_in();

-- 3. Backfill existing data
-- We can't easily read auth.users in a migration for backfill without specific permissions, 
-- but we can try. If it fails, we wrap in a DO block or just accept it starts from now.
DO $$
BEGIN
    -- Try to backfill if possible (this might be restricted depending on permissions)
    -- Using a secure view or just ignoring it for now as it's an enhancement.
    -- In standard Supabase, we can access auth.users via seeing it if we are superuser, 
    -- but migrations run as a specific user.
    -- Let's skip backfill to avoid migration failure risk, it will populate on next login.
    NULL;
END $$;
