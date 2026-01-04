-- Phase 7: Support Admin Schema Updates
-- Add status columns to workspaces and profiles

-- 1. Update Workspaces Table
-- Add status enum
DO $$ BEGIN
    CREATE TYPE workspace_status AS ENUM ('active', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add columns
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS status workspace_status NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON workspaces(status);
CREATE INDEX IF NOT EXISTS idx_workspaces_deleted_at ON workspaces(deleted_at) WHERE deleted_at IS NOT NULL;

-- 2. Update Profiles Table
-- Add ban columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;

-- Index for ban filtering
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned) WHERE is_banned = TRUE;

-- 3. Security Definitions (RLS)
-- Drop views and functions first to allow return type changes
DROP VIEW IF EXISTS support_users;
DROP FUNCTION IF EXISTS get_support_users();

CREATE OR REPLACE VIEW support_users AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.created_at,
    p.updated_at,
    p.is_banned,
    p.banned_at
FROM profiles p;

-- Re-apply the function to match the view
CREATE OR REPLACE FUNCTION get_support_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_banned BOOLEAN,
    banned_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.created_at,
        p.updated_at,
        p.is_banned,
        p.banned_at
    FROM profiles p
    WHERE is_support_admin();
$$;

-- Update support_workspaces view to include status
DROP VIEW IF EXISTS support_workspaces;
DROP FUNCTION IF EXISTS get_support_workspaces();

CREATE OR REPLACE VIEW support_workspaces AS
SELECT 
    w.id,
    w.name,
    w.created_at,
    w.created_by,
    w.status,
    w.deleted_at,
    (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.id) as member_count
FROM workspaces w;

CREATE OR REPLACE FUNCTION get_support_workspaces()
RETURNS TABLE (
    id UUID,
    name TEXT,
    created_at TIMESTAMPTZ,
    created_by UUID,
    status workspace_status,
    deleted_at TIMESTAMPTZ,
    member_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT 
        w.id,
        w.name,
        w.created_at,
        w.created_by,
        w.status,
        w.deleted_at,
        (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.id) as member_count
    FROM workspaces w
    WHERE is_support_admin();
$$;
