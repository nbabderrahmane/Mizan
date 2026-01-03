-- ============================================================================
-- Mizan Functions & Triggers - 003_functions_triggers.sql
-- ============================================================================
-- Triggers for automatic profile creation and helper functions
-- ============================================================================

-- ============================================================================
-- PROFILE CREATION TRIGGER
-- ============================================================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply to profiles table
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- WORKSPACE MEMBER HELPER FUNCTIONS
-- ============================================================================

-- Add workspace owner when workspace is created
CREATE OR REPLACE FUNCTION add_workspace_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
    VALUES (NEW.id, NEW.created_by, 'OWNER', NOW());
    RETURN NEW;
END;
$$;

-- Trigger to add owner on workspace creation
CREATE TRIGGER on_workspace_created
    AFTER INSERT ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION add_workspace_owner();

-- ============================================================================
-- AUDIT LOG HELPER FUNCTION
-- ============================================================================

-- Helper function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log(
    p_workspace_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT,
    p_payload_public JSONB DEFAULT '{}',
    p_payload_sensitive JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        workspace_id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        payload_public,
        payload_sensitive,
        created_at
    )
    VALUES (
        p_workspace_id,
        auth.uid(),
        p_action,
        p_entity_type,
        p_entity_id,
        p_payload_public,
        p_payload_sensitive,
        NOW()
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- ============================================================================
-- PROVISION BALANCE HELPER
-- ============================================================================

-- Calculate provision balance
CREATE OR REPLACE FUNCTION get_provision_balance(p_provision_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        SUM(
            CASE 
                WHEN entry_type IN ('fund', 'adjust') THEN amount_in_reserved_account_currency
                WHEN entry_type IN ('consume', 'release') THEN -amount_in_reserved_account_currency
                ELSE 0
            END
        ),
        0
    )
    FROM provision_ledger
    WHERE provision_id = p_provision_id;
$$;

-- ============================================================================
-- ACCOUNT BALANCE HELPERS
-- ============================================================================

-- Calculate account balance (opening + transactions)
CREATE OR REPLACE FUNCTION get_account_balance(p_account_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        COALESCE(a.opening_balance, 0) + 
        COALESCE((
            SELECT SUM(base_amount)
            FROM transactions
            WHERE account_id = p_account_id
        ), 0)
    FROM accounts a
    WHERE a.id = p_account_id;
$$;

-- Calculate reserved cash for an account (from provisions)
CREATE OR REPLACE FUNCTION get_account_reserved(p_account_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        SUM(get_provision_balance(p.id)),
        0
    )
    FROM provisions p
    WHERE p.reserved_account_id = p_account_id
    AND p.status = 'active'
    AND get_provision_balance(p.id) > 0;
$$;

-- Get account available cash (balance - reserved)
CREATE OR REPLACE FUNCTION get_account_available(p_account_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT get_account_balance(p_account_id) - get_account_reserved(p_account_id);
$$;

-- ============================================================================
-- TRANSACTION VALIDATION
-- ============================================================================

-- Validate transaction before insert/update
CREATE OR REPLACE FUNCTION validate_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Expense must have category and subcategory
    IF NEW.type = 'expense' AND (NEW.category_id IS NULL OR NEW.subcategory_id IS NULL) THEN
        RAISE EXCEPTION 'Expense transactions must have a category and subcategory';
    END IF;
    
    -- Transfer must have transfer_account_id
    IF NEW.type = 'transfer' AND NEW.transfer_account_id IS NULL THEN
        RAISE EXCEPTION 'Transfer transactions must specify a destination account';
    END IF;
    
    -- Transfer cannot transfer to same account
    IF NEW.type = 'transfer' AND NEW.account_id = NEW.transfer_account_id THEN
        RAISE EXCEPTION 'Cannot transfer to the same account';
    END IF;
    
    -- Set attributed_to_user_id if not set
    IF NEW.attributed_to_user_id IS NULL THEN
        NEW.attributed_to_user_id := NEW.created_by;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER validate_transaction_trigger
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION validate_transaction();

-- ============================================================================
-- RATE LIMITING TABLE (for basic auth rate limiting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW()
);

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_key TEXT,
    p_max_requests INTEGER DEFAULT 10,
    p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
    v_window_start TIMESTAMPTZ;
BEGIN
    -- Get current rate limit entry
    SELECT count, window_start INTO v_count, v_window_start
    FROM rate_limits
    WHERE key = p_key;
    
    -- If no entry or window expired, create/reset
    IF v_window_start IS NULL OR v_window_start < NOW() - (p_window_seconds || ' seconds')::INTERVAL THEN
        INSERT INTO rate_limits (key, count, window_start)
        VALUES (p_key, 1, NOW())
        ON CONFLICT (key) DO UPDATE
        SET count = 1, window_start = NOW();
        RETURN TRUE;
    END IF;
    
    -- Check if limit exceeded
    IF v_count >= p_max_requests THEN
        RETURN FALSE;
    END IF;
    
    -- Increment counter
    UPDATE rate_limits
    SET count = count + 1
    WHERE key = p_key;
    
    RETURN TRUE;
END;
$$;

-- Enable RLS on rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- No direct access to rate_limits, only via function

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION handle_new_user() IS 'Creates a profile row when a new user signs up';
COMMENT ON FUNCTION add_workspace_owner() IS 'Adds the creator as OWNER when a workspace is created';
COMMENT ON FUNCTION create_audit_log(UUID, TEXT, TEXT, TEXT, JSONB, JSONB) IS 'Helper to create audit log entries';
COMMENT ON FUNCTION get_provision_balance(UUID) IS 'Calculate current provision balance from ledger entries';
COMMENT ON FUNCTION get_account_balance(UUID) IS 'Calculate account balance (opening + transactions)';
COMMENT ON FUNCTION get_account_reserved(UUID) IS 'Calculate total reserved cash from active provisions';
COMMENT ON FUNCTION get_account_available(UUID) IS 'Calculate available cash (balance - reserved)';
COMMENT ON FUNCTION check_rate_limit(TEXT, INTEGER, INTEGER) IS 'Check and update rate limit for a given key';
