-- ============================================================================
-- Mizan RLS Policies - 002_rls_policies.sql
-- ============================================================================
-- Row Level Security policies implementing RBAC:
-- - OWNER/MANAGER: full access
-- - CONTRIBUTOR: read all, create transactions, edit/delete own transactions
-- - VIEWER: read only
-- - SUPPORT_ADMIN: metadata only (no financial data)
--
-- IMPORTANT: Uses SECURITY DEFINER functions to avoid RLS recursion
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE provisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE provision_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- These bypass RLS for role checks, preventing recursion
-- ============================================================================

-- Check if current user is a SUPPORT_ADMIN
CREATE OR REPLACE FUNCTION is_support_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM app_admins
        WHERE user_id = auth.uid()
        AND role = 'SUPPORT_ADMIN'
    );
$$;

-- Check if current user is a member of a workspace
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = ws_id
        AND user_id = auth.uid()
    );
$$;

-- Check if current user has one of the specified roles in a workspace
CREATE OR REPLACE FUNCTION has_workspace_role(ws_id UUID, allowed_roles workspace_role[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = ws_id
        AND user_id = auth.uid()
        AND role = ANY(allowed_roles)
    );
$$;

-- Get current user's role in a workspace
CREATE OR REPLACE FUNCTION get_workspace_role(ws_id UUID)
RETURNS workspace_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role FROM workspace_members
    WHERE workspace_id = ws_id
    AND user_id = auth.uid()
    LIMIT 1;
$$;

-- Check if user can manage workspace (OWNER or MANAGER)
CREATE OR REPLACE FUNCTION can_manage_workspace(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT has_workspace_role(ws_id, ARRAY['OWNER', 'MANAGER']::workspace_role[]);
$$;

-- Check if user can contribute to workspace (OWNER, MANAGER, or CONTRIBUTOR)
CREATE OR REPLACE FUNCTION can_contribute_to_workspace(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT has_workspace_role(ws_id, ARRAY['OWNER', 'MANAGER', 'CONTRIBUTOR']::workspace_role[]);
$$;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Profiles are inserted via trigger, not directly
CREATE POLICY "profiles_insert_system"
ON profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- ============================================================================
-- APP_ADMINS POLICIES
-- ============================================================================

-- Support admins can read their own admin status
CREATE POLICY "app_admins_select_own"
ON app_admins FOR SELECT
USING (user_id = auth.uid());

-- No insert/update/delete via client - managed by service role only

-- ============================================================================
-- WORKSPACES POLICIES
-- ============================================================================

-- Members can read workspaces they belong to
CREATE POLICY "workspaces_select_member"
ON workspaces FOR SELECT
USING (is_workspace_member(id));

-- Any authenticated user can create a workspace
CREATE POLICY "workspaces_insert_authenticated"
ON workspaces FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Only OWNER/MANAGER can update workspace
CREATE POLICY "workspaces_update_manager"
ON workspaces FOR UPDATE
USING (can_manage_workspace(id))
WITH CHECK (can_manage_workspace(id));

-- Only OWNER can delete workspace (implement OWNER-only via app logic)
CREATE POLICY "workspaces_delete_owner"
ON workspaces FOR DELETE
USING (has_workspace_role(id, ARRAY['OWNER']::workspace_role[]));

-- ============================================================================
-- WORKSPACE_MEMBERS POLICIES
-- ============================================================================

-- Members can see other members in their workspaces
CREATE POLICY "workspace_members_select"
ON workspace_members FOR SELECT
USING (is_workspace_member(workspace_id));

-- OWNER/MANAGER can add members
CREATE POLICY "workspace_members_insert"
ON workspace_members FOR INSERT
WITH CHECK (
    can_manage_workspace(workspace_id)
    OR (user_id = auth.uid() AND workspace_id IN (SELECT id FROM workspaces WHERE created_by = auth.uid()))
);

-- OWNER/MANAGER can update member roles
CREATE POLICY "workspace_members_update"
ON workspace_members FOR UPDATE
USING (can_manage_workspace(workspace_id))
WITH CHECK (can_manage_workspace(workspace_id));

-- OWNER/MANAGER can remove members (or member can remove themselves)
CREATE POLICY "workspace_members_delete"
ON workspace_members FOR DELETE
USING (
    can_manage_workspace(workspace_id)
    OR user_id = auth.uid()
);

-- ============================================================================
-- ACCOUNTS POLICIES
-- (Financial data - SUPPORT_ADMIN CANNOT access)
-- ============================================================================

-- Only workspace members can read accounts
CREATE POLICY "accounts_select_member"
ON accounts FOR SELECT
USING (is_workspace_member(workspace_id) AND NOT is_support_admin());

-- OWNER/MANAGER can insert accounts
CREATE POLICY "accounts_insert_manager"
ON accounts FOR INSERT
WITH CHECK (can_manage_workspace(workspace_id));

-- OWNER/MANAGER can update accounts
CREATE POLICY "accounts_update_manager"
ON accounts FOR UPDATE
USING (can_manage_workspace(workspace_id))
WITH CHECK (can_manage_workspace(workspace_id));

-- OWNER/MANAGER can delete accounts
CREATE POLICY "accounts_delete_manager"
ON accounts FOR DELETE
USING (can_manage_workspace(workspace_id));

-- ============================================================================
-- CATEGORIES POLICIES
-- ============================================================================

-- Members can read categories
CREATE POLICY "categories_select_member"
ON categories FOR SELECT
USING (is_workspace_member(workspace_id));

-- OWNER/MANAGER can manage categories
CREATE POLICY "categories_insert_manager"
ON categories FOR INSERT
WITH CHECK (can_manage_workspace(workspace_id));

CREATE POLICY "categories_update_manager"
ON categories FOR UPDATE
USING (can_manage_workspace(workspace_id))
WITH CHECK (can_manage_workspace(workspace_id));

CREATE POLICY "categories_delete_manager"
ON categories FOR DELETE
USING (can_manage_workspace(workspace_id));

-- ============================================================================
-- SUBCATEGORIES POLICIES
-- ============================================================================

CREATE POLICY "subcategories_select_member"
ON subcategories FOR SELECT
USING (is_workspace_member(workspace_id));

CREATE POLICY "subcategories_insert_manager"
ON subcategories FOR INSERT
WITH CHECK (can_manage_workspace(workspace_id));

CREATE POLICY "subcategories_update_manager"
ON subcategories FOR UPDATE
USING (can_manage_workspace(workspace_id))
WITH CHECK (can_manage_workspace(workspace_id));

CREATE POLICY "subcategories_delete_manager"
ON subcategories FOR DELETE
USING (can_manage_workspace(workspace_id));

-- ============================================================================
-- MONTHLY_BUDGETS POLICIES
-- (Planning data - SUPPORT_ADMIN CANNOT access amounts)
-- ============================================================================

CREATE POLICY "monthly_budgets_select_member"
ON monthly_budgets FOR SELECT
USING (is_workspace_member(workspace_id) AND NOT is_support_admin());

CREATE POLICY "monthly_budgets_insert_manager"
ON monthly_budgets FOR INSERT
WITH CHECK (can_manage_workspace(workspace_id));

CREATE POLICY "monthly_budgets_update_manager"
ON monthly_budgets FOR UPDATE
USING (can_manage_workspace(workspace_id))
WITH CHECK (can_manage_workspace(workspace_id));

CREATE POLICY "monthly_budgets_delete_manager"
ON monthly_budgets FOR DELETE
USING (can_manage_workspace(workspace_id));

-- ============================================================================
-- PROVISIONS POLICIES
-- (Financial data - SUPPORT_ADMIN CANNOT access)
-- ============================================================================

CREATE POLICY "provisions_select_member"
ON provisions FOR SELECT
USING (is_workspace_member(workspace_id) AND NOT is_support_admin());

CREATE POLICY "provisions_insert_manager"
ON provisions FOR INSERT
WITH CHECK (can_manage_workspace(workspace_id));

CREATE POLICY "provisions_update_manager"
ON provisions FOR UPDATE
USING (can_manage_workspace(workspace_id))
WITH CHECK (can_manage_workspace(workspace_id));

CREATE POLICY "provisions_delete_manager"
ON provisions FOR DELETE
USING (can_manage_workspace(workspace_id));

-- ============================================================================
-- PROVISION_LEDGER POLICIES
-- (Financial data - SUPPORT_ADMIN CANNOT access)
-- ============================================================================

CREATE POLICY "provision_ledger_select_member"
ON provision_ledger FOR SELECT
USING (is_workspace_member(workspace_id) AND NOT is_support_admin());

-- Contributors can create provision ledger entries
CREATE POLICY "provision_ledger_insert_contributor"
ON provision_ledger FOR INSERT
WITH CHECK (
    can_contribute_to_workspace(workspace_id)
    AND created_by = auth.uid()
);

-- OWNER/MANAGER can update provision ledger
CREATE POLICY "provision_ledger_update_manager"
ON provision_ledger FOR UPDATE
USING (can_manage_workspace(workspace_id))
WITH CHECK (can_manage_workspace(workspace_id));

-- OWNER/MANAGER can delete provision ledger entries
CREATE POLICY "provision_ledger_delete_manager"
ON provision_ledger FOR DELETE
USING (can_manage_workspace(workspace_id));

-- ============================================================================
-- TRANSACTIONS POLICIES
-- (Financial data - SUPPORT_ADMIN CANNOT access)
-- ============================================================================

-- Members can read all transactions in workspace
CREATE POLICY "transactions_select_member"
ON transactions FOR SELECT
USING (is_workspace_member(workspace_id) AND NOT is_support_admin());

-- Contributors can create transactions
CREATE POLICY "transactions_insert_contributor"
ON transactions FOR INSERT
WITH CHECK (
    can_contribute_to_workspace(workspace_id)
    AND created_by = auth.uid()
);

-- Contributors can update their own transactions, OWNER/MANAGER can update any
CREATE POLICY "transactions_update"
ON transactions FOR UPDATE
USING (
    can_manage_workspace(workspace_id)
    OR (can_contribute_to_workspace(workspace_id) AND (created_by = auth.uid() OR attributed_to_user_id = auth.uid()))
)
WITH CHECK (
    can_manage_workspace(workspace_id)
    OR (can_contribute_to_workspace(workspace_id) AND (created_by = auth.uid() OR attributed_to_user_id = auth.uid()))
);

-- Contributors can delete their own transactions, OWNER/MANAGER can delete any
CREATE POLICY "transactions_delete"
ON transactions FOR DELETE
USING (
    can_manage_workspace(workspace_id)
    OR (can_contribute_to_workspace(workspace_id) AND (created_by = auth.uid() OR attributed_to_user_id = auth.uid()))
);

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

-- Users can read their own notifications
CREATE POLICY "notifications_select_own"
ON notifications FOR SELECT
USING (user_id = auth.uid());

-- System/other users can create notifications for a user
CREATE POLICY "notifications_insert"
ON notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update_own"
ON notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own"
ON notifications FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- INVITES POLICIES
-- ============================================================================

-- Members can see invites for their workspaces
CREATE POLICY "invites_select_member"
ON invites FOR SELECT
USING (
    is_workspace_member(workspace_id)
    OR invited_email = (SELECT email FROM profiles WHERE id = auth.uid())
    OR token IS NOT NULL -- Allow checking specific token via app logic with service role
);

-- OWNER/MANAGER can create invites
CREATE POLICY "invites_insert_manager"
ON invites FOR INSERT
WITH CHECK (can_manage_workspace(workspace_id) AND created_by = auth.uid());

-- OWNER/MANAGER can update invites (cancel, etc.)
CREATE POLICY "invites_update_manager"
ON invites FOR UPDATE
USING (can_manage_workspace(workspace_id))
WITH CHECK (can_manage_workspace(workspace_id));

-- OWNER/MANAGER can delete invites
CREATE POLICY "invites_delete_manager"
ON invites FOR DELETE
USING (can_manage_workspace(workspace_id));

-- ============================================================================
-- AUDIT_LOGS POLICIES
-- ============================================================================

-- OWNER/MANAGER can read audit logs for their workspaces
CREATE POLICY "audit_logs_select_manager"
ON audit_logs FOR SELECT
USING (
    (workspace_id IS NOT NULL AND can_manage_workspace(workspace_id))
    OR (workspace_id IS NULL AND actor_user_id = auth.uid())
);

-- All authenticated users can insert audit logs (write-only)
CREATE POLICY "audit_logs_insert"
ON audit_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND actor_user_id = auth.uid());

-- No update or delete for audit logs (immutable)

-- ============================================================================
-- FX_RATES POLICIES
-- ============================================================================

-- All authenticated users can read FX rates
CREATE POLICY "fx_rates_select_authenticated"
ON fx_rates FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only server/edge functions insert/update FX rates (via service role)
-- No client-side insert/update/delete

-- ============================================================================
-- SUPPORT VIEWS (for SUPPORT_ADMIN - no financial data)
-- ============================================================================

-- Support view: Workspaces metadata only
CREATE OR REPLACE VIEW support_workspaces AS
SELECT 
    w.id,
    w.name,
    w.created_at,
    w.created_by,
    (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.id) as member_count
FROM workspaces w;

-- Support view: Users metadata only  
CREATE OR REPLACE VIEW support_users AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.created_at,
    p.updated_at
FROM profiles p;

-- Grant access to support views for SUPPORT_ADMIN
-- Note: These views need RLS bypass for SUPPORT_ADMIN, implemented via function

CREATE OR REPLACE FUNCTION get_support_workspaces()
RETURNS TABLE (
    id UUID,
    name TEXT,
    created_at TIMESTAMPTZ,
    created_by UUID,
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
        (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.id) as member_count
    FROM workspaces w
    WHERE is_support_admin();
$$;

CREATE OR REPLACE FUNCTION get_support_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
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
        p.updated_at
    FROM profiles p
    WHERE is_support_admin();
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION is_support_admin() IS 'Check if current user is a SUPPORT_ADMIN. Uses SECURITY DEFINER to avoid RLS recursion.';
COMMENT ON FUNCTION is_workspace_member(UUID) IS 'Check if current user is a member of the workspace. Uses SECURITY DEFINER to avoid RLS recursion.';
COMMENT ON FUNCTION has_workspace_role(UUID, workspace_role[]) IS 'Check if current user has any of the specified roles in workspace. Uses SECURITY DEFINER to avoid RLS recursion.';
COMMENT ON FUNCTION can_manage_workspace(UUID) IS 'Check if current user can manage workspace (OWNER or MANAGER).';
COMMENT ON FUNCTION can_contribute_to_workspace(UUID) IS 'Check if current user can contribute to workspace (OWNER, MANAGER, or CONTRIBUTOR).';
COMMENT ON FUNCTION get_support_workspaces() IS 'Get workspace metadata for SUPPORT_ADMIN. No financial data exposed.';
COMMENT ON FUNCTION get_support_users() IS 'Get user metadata for SUPPORT_ADMIN. No financial data exposed.';
