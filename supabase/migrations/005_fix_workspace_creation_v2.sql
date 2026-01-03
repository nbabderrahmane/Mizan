-- ============================================================================
-- Mizan RLS Fix v2 - 005_fix_workspace_creation_v2.sql
-- ============================================================================
-- This creates a SECURITY DEFINER function that bypasses RLS for 
-- workspace creation. This is a workaround for the auth.uid() returning
-- NULL in RLS context issue.
-- ============================================================================

-- Drop the function if it exists
DROP FUNCTION IF EXISTS create_workspace_for_user(TEXT, UUID);

-- Create a SECURITY DEFINER function to create workspaces
-- This bypasses RLS and directly inserts the workspace and membership
CREATE OR REPLACE FUNCTION create_workspace_for_user(
    p_name TEXT,
    p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_workspace_id UUID;
BEGIN
    -- Validate inputs
    IF p_name IS NULL OR p_name = '' THEN
        RAISE EXCEPTION 'Workspace name is required';
    END IF;
    
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;
    
    -- Create the workspace
    INSERT INTO workspaces (name, created_by)
    VALUES (p_name, p_user_id)
    RETURNING id INTO v_workspace_id;
    
    -- Note: The add_workspace_owner trigger will automatically add the user as OWNER
    -- But since trigger is AFTER INSERT, the membership is created automatically
    
    RETURN v_workspace_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_workspace_for_user(TEXT, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_workspace_for_user(TEXT, UUID) IS 
'Creates a workspace for a user. Uses SECURITY DEFINER to bypass RLS. 
The add_workspace_owner trigger automatically adds the user as OWNER.';
