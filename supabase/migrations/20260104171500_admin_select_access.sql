-- Grant SUPPORT_ADMIN read access to remaining tables

-- Accounts (SELECT)
CREATE POLICY "accounts_select_admin"
ON accounts FOR SELECT
USING (is_support_admin());

-- Categories (SELECT)
CREATE POLICY "categories_select_admin"
ON categories FOR SELECT
USING (is_support_admin());

-- Subcategories (SELECT)
CREATE POLICY "subcategories_select_admin"
ON subcategories FOR SELECT
USING (is_support_admin());

-- Monthly Budgets (SELECT)
CREATE POLICY "monthly_budgets_select_admin"
ON monthly_budgets FOR SELECT
USING (is_support_admin());

-- Invites (SELECT)
CREATE POLICY "invites_select_admin"
ON invites FOR SELECT
USING (is_support_admin());
