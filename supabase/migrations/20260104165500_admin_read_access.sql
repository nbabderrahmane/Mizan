-- Grant SUPPORT_ADMIN read access to core tables

-- Workspaces
CREATE POLICY "workspaces_select_admin"
ON workspaces FOR SELECT
USING (is_support_admin());

-- Profiles (Admin needs to see all users)
CREATE POLICY "profiles_select_admin"
ON profiles FOR SELECT
USING (is_support_admin());

-- Workspace Members
CREATE POLICY "workspace_members_select_admin"
ON workspace_members FOR SELECT
USING (is_support_admin());
