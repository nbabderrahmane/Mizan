-- ============================================================================
-- Security Patch: Secure Support Views - 20260107094000_secure_support_views.sql
-- ============================================================================
-- Fixes SECURITY DEFINER vulnerability by enforcing explicit Role Check inside the view.
-- Even if a user accesses the view, they will get 0 rows unless they are a Support Admin.
-- ============================================================================

-- 1. Secure support_users view
CREATE OR REPLACE VIEW support_users WITH (security_invoker = true) AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.created_at,
    p.updated_at,
    p.is_banned,
    p.banned_at
FROM profiles p
WHERE is_support_admin() = true; -- Extra safety: Ensure only admins get data

-- 2. Secure support_workspaces view
CREATE OR REPLACE VIEW support_workspaces WITH (security_invoker = true) AS
SELECT 
    w.id,
    w.name,
    w.created_at,
    w.created_by,
    w.status,
    w.deleted_at,
    (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.id) as member_count
FROM workspaces w
WHERE is_support_admin() = true; -- Extra safety: Ensure only admins get data

-- Explanation:
-- Previously, the views (defined in 20260104161500) relied on the calling context or lacked the WHERE clause
-- when recreated. By adding `WHERE is_support_admin() = true`, we ensure that the detailed
-- data is only materialized if the current executing user has the admin role.
-- This effectively mitigates the risk of a non-admin accessing the SECURITY DEFINER view.
