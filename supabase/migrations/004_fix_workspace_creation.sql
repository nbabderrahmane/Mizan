-- ============================================================================
-- Mizan RLS Fix - 004_fix_workspace_creation.sql
-- ============================================================================
-- Run this AFTER running 001, 002, 003 migrations
-- Fixes the workspace creation RLS issue
-- ============================================================================

-- Drop the problematic policies first
DROP POLICY IF EXISTS "workspaces_insert_authenticated" ON workspaces;
DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;

-- ============================================================================
-- FIX 1: Simplified workspace insert policy
-- Any authenticated user can create a workspace if they set themselves as creator
-- ============================================================================
CREATE POLICY "workspaces_insert_authenticated"
ON workspaces FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND created_by = auth.uid()
);

-- ============================================================================
-- FIX 2: Workspace members insert policy
-- - OWNER/MANAGER can add members
-- - The workspace owner trigger (SECURITY DEFINER) bypasses RLS anyway
-- - Allow self-insert if user created the workspace
-- ============================================================================
CREATE POLICY "workspace_members_insert"
ON workspace_members FOR INSERT
WITH CHECK (
    -- Case 1: User is already OWNER/MANAGER and adding someone else
    can_manage_workspace(workspace_id)
    -- Case 2: User is being added by trigger (they created the workspace)
    OR (
        user_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM workspaces 
            WHERE id = workspace_id 
            AND created_by = auth.uid()
        )
    )
);

-- ============================================================================
-- VERIFY: Test the policies
-- ============================================================================
-- After running this, workspace creation should work.
-- Test by creating a workspace:
--
-- INSERT INTO workspaces (name, created_by) 
-- VALUES ('Test Workspace', auth.uid());
--
-- This should succeed and automatically add you as OWNER via trigger.
-- ============================================================================
