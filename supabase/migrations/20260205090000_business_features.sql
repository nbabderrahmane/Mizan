-- Migration for Business Features (Cash Registers, Attachments, RLS updates)
-- Created: 2026-02-05

-- ============================================================================
-- 1. Add owner_user_id to accounts (The "Caisse" Logic)
-- ============================================================================

-- A "Caisse" is simply a CASH account assigned to a specific user.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_owner_user_id ON accounts(owner_user_id);

COMMENT ON COLUMN accounts.owner_user_id IS 'If set, this account is a personal Cash Register for this specific user. Only this user and Managers can see/use it.';

-- ============================================================================
-- 2. Create transaction_attachments table (Justification logic)
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,          -- Path in Storage Bucket
    file_type TEXT NOT NULL,          -- MIME type (image/jpeg, application/pdf)
    file_size INTEGER,                -- Size in bytes
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_attachments_transaction_id ON transaction_attachments(transaction_id);

-- Enable RLS
ALTER TABLE transaction_attachments ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE transaction_attachments IS 'Attachments (receipts, invoices) linked to transactions.';

-- ============================================================================
-- 3. HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Helper to check if user has access to a specific account
-- Access = 
--   1. Account is in a workspace user is member of
--   AND
--   2. (User is Manager/Owner OR Account is Open/Public OR Account is assigned to User)
CREATE OR REPLACE FUNCTION can_view_account(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM accounts a
        WHERE a.id = p_account_id
        AND (
            -- Basic workspace membership check
            is_workspace_member(a.workspace_id)
            AND
            (
                -- Managers see everything
                can_manage_workspace(a.workspace_id)
                OR
                -- Public accounts (no owner) are visible to all members
                a.owner_user_id IS NULL
                OR
                -- Private accounts visible only to owner
                a.owner_user_id = auth.uid()
            )
        )
    );
$$;

COMMENT ON FUNCTION can_view_account(UUID) IS 'Check if current user can view a specific account based on ownership rules.';

-- ============================================================================
-- 4. UPDATE ACCOUNTS RLS
-- ============================================================================

-- Drop old policy
DROP POLICY IF EXISTS "accounts_select_member" ON accounts;

-- New policy with ownership check
CREATE POLICY "accounts_select_member" ON accounts FOR SELECT
USING (
    is_workspace_member(workspace_id) 
    AND NOT is_support_admin()
    AND (
        owner_user_id IS NULL 
        OR owner_user_id = auth.uid() 
        OR can_manage_workspace(workspace_id)
    )
);

-- ============================================================================
-- 5. UPDATE TRANSACTIONS RLS
-- ============================================================================

-- Transactions visibility should mirror Account visibility.
-- If I can't see the "Caisse", I shouldn't see its transactions.

DROP POLICY IF EXISTS "transactions_select_member" ON transactions;

CREATE POLICY "transactions_select_member" ON transactions FOR SELECT
USING (
    is_workspace_member(workspace_id) 
    AND NOT is_support_admin()
    AND (
        -- Can view the associated account
        can_view_account(account_id)
    )
);

-- Note: Contributors can still INSERT transactions if they have permission on the account.
-- The standard "transactions_insert_contributor" policy uses `can_contribute_to_workspace`.
-- We should ideally restrict INSERT to only allowed accounts too. 
-- But existing check is just `can_contribute_to_workspace`.
-- Let's tighten INSERT as well to avoid "Blind Insert" into someone else's Caisse.

DROP POLICY IF EXISTS "transactions_insert_contributor" ON transactions;

CREATE POLICY "transactions_insert_contributor" ON transactions FOR INSERT
WITH CHECK (
    can_contribute_to_workspace(workspace_id)
    AND created_by = auth.uid()
    -- New: Must be able to view the account we are inserting into
    AND can_view_account(account_id)
);

-- ============================================================================
-- 6. ATTACHMENTS RLS
-- ============================================================================

-- Select: If you can see the transaction, you can see the attachment
CREATE POLICY "attachments_select_member" ON transaction_attachments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.id = transaction_id
        AND can_view_account(t.account_id) -- Or just ensure row exists in visible transactions view
        -- But since we just restricted transactions_select, we can rely on RLS recursion if we queried transactions?
        -- No, let's use the helper to be safe and direct.
    )
);

-- Insert: Must be able to view transaction (and thus account) and contribute
CREATE POLICY "attachments_insert_contributor" ON transaction_attachments FOR INSERT
WITH CHECK (
    uploaded_by = auth.uid()
    AND
    EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.id = transaction_id
        -- Must effectively own the tx or be a manager?
        -- For now, allow if you can view the transaction and contribute to workspace
        AND can_contribute_to_workspace(t.workspace_id)
        AND can_view_account(t.account_id)
    )
);

-- Delete: Uploader OR Workspace Manager
CREATE POLICY "attachments_delete_policy" ON transaction_attachments FOR DELETE
USING (
    uploaded_by = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.id = transaction_id
        AND can_manage_workspace(t.workspace_id)
    )
);
