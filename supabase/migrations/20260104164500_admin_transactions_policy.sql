-- Allow SUPPORT_ADMIN to select all transactions for system stats
CREATE POLICY "transactions_select_admin"
ON transactions FOR SELECT
USING (is_support_admin());
