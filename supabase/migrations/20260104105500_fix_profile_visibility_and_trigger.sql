-- 1. Update handle_new_user function to populate first_name and last_name
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_full_name TEXT;
BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        first_name, 
        last_name, 
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(v_full_name, ' ', 1)),
        COALESCE(NEW.raw_user_meta_data->>'last_name', NULLIF(substring(v_full_name from position(' ' in v_full_name) + 1), '')),
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$;

-- 2. Add RLS policy to allow workspace members to see each other's profiles
CREATE POLICY "profiles_select_workspace_members"
ON profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM workspace_members m1
        JOIN workspace_members m2 ON m1.workspace_id = m2.workspace_id
        WHERE m1.user_id = auth.uid()
        AND m2.user_id = profiles.id
    )
);

-- 3. Data Patch: Ensure existing profiles have first_name and last_name
UPDATE profiles
SET 
  first_name = COALESCE(first_name, split_part(full_name, ' ', 1)),
  last_name = COALESCE(last_name, NULLIF(substring(full_name from position(' ' in full_name) + 1), ''))
WHERE first_name IS NULL OR last_name IS NULL;
