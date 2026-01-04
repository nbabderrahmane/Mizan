-- Grant SUPPORT_ADMIN write access to accounts and transactions for debugging/support

-- Accounts (Insert/Update/Delete)
CREATE POLICY "accounts_insert_admin"
ON accounts FOR INSERT
WITH CHECK (is_support_admin());

CREATE POLICY "accounts_update_admin"
ON accounts FOR UPDATE
USING (is_support_admin());

CREATE POLICY "accounts_delete_admin"
ON accounts FOR DELETE
USING (is_support_admin());


-- Transactions (Insert/Update/Delete)
CREATE POLICY "transactions_insert_admin"
ON transactions FOR INSERT
WITH CHECK (is_support_admin());

CREATE POLICY "transactions_update_admin"
ON transactions FOR UPDATE
USING (is_support_admin());

CREATE POLICY "transactions_delete_admin"
ON transactions FOR DELETE
USING (is_support_admin());
