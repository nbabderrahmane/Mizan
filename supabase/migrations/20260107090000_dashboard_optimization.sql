-- ============================================================================
-- Mizan Dashboard Optimization - 20260107090000_dashboard_optimization.sql
-- ============================================================================
-- Performance improvement: Move aggregation logic from app server to database.
-- ============================================================================

-- 1. Get Dashboard Stats (Total Balances, Income, Expenses)
CREATE OR REPLACE FUNCTION get_dashboard_stats(
    p_workspace_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_total_balance NUMERIC := 0;
    v_monthly_income NUMERIC := 0;
    v_monthly_expenses NUMERIC := 0;
    v_currency CHAR(3);
    v_start_month TIMESTAMP;
    v_accounts JSONB;
BEGIN
    -- Get workspace currency
    SELECT currency INTO v_currency FROM workspaces WHERE id = p_workspace_id;
    v_start_month := date_trunc('month', NOW());

    -- Calculate Totals from Accounts (Current Balance)
    -- We assume account opening balance + all transactions = current balance
    -- NOTE: In a real multi-currency system, we would need FX conversion here.
    -- For now, we sum base_amount assuming simple conversion or same currency for optimization speed.
    -- Ideally, FX conversion happens at application layer or via detailed SQL.
    -- To keep it fast, we calculate native totals.

    -- 1. Total Balance (Sum of all accounts' current value)
    -- This requires summing opening_balance + sum(transactions) for each account
    WITH account_balances AS (
        SELECT 
            a.id,
            a.opening_balance + COALESCE(SUM(t.base_amount), 0) as current_balance
        FROM accounts a
        LEFT JOIN transactions t ON t.account_id = a.id
        WHERE a.workspace_id = p_workspace_id AND a.is_archived = FALSE
        GROUP BY a.id, a.opening_balance
    )
    SELECT COALESCE(SUM(current_balance), 0) INTO v_total_balance FROM account_balances;

    -- 2. Monthly Income/Expenses (Current Month)
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN base_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'expense' THEN ABS(base_amount) ELSE 0 END), 0)
    INTO v_monthly_income, v_monthly_expenses
    FROM transactions
    WHERE workspace_id = p_workspace_id
    AND date >= v_start_month;

    RETURN jsonb_build_object(
        'total_balance', v_total_balance,
        'monthly_income', v_monthly_income,
        'monthly_expenses', v_monthly_expenses,
        'currency', v_currency
    );
END;
$$;

-- 2. Validate Expenses by Category (for Pie Chart)
CREATE OR REPLACE FUNCTION get_expenses_by_category(
    p_workspace_id UUID,
    p_start_date TIMESTAMP DEFAULT date_trunc('month', NOW()),
    p_end_date TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE (
    category_name TEXT,
    total_amount NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT 
        c.name as category_name,
        SUM(ABS(t.base_amount)) as total_amount
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.workspace_id = p_workspace_id
    AND t.type = 'expense'
    AND t.date >= p_start_date
    AND t.date <= p_end_date
    GROUP BY c.name
    ORDER BY total_amount DESC;
$$;

-- 3. Balance History (Daily closing balance)
CREATE OR REPLACE FUNCTION get_balance_history(
    p_workspace_id UUID,
    p_start_date TIMESTAMP,
    p_end_date TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE (
    day DATE,
    balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_initial_balance NUMERIC;
BEGIN
    -- Calculate balance BEFORE the start date
    -- Sum of opening balances + sum of transactions prior to p_start_date
    WITH initial_calc AS (
        SELECT 
            (SELECT COALESCE(SUM(opening_balance), 0) FROM accounts WHERE workspace_id = p_workspace_id AND is_archived = FALSE) +
            (SELECT COALESCE(SUM(base_amount), 0) FROM transactions WHERE workspace_id = p_workspace_id AND date < p_start_date) 
            as start_val
    )
    SELECT start_val INTO v_initial_balance FROM initial_calc;

    RETURN QUERY
    WITH daily_changes AS (
        SELECT 
            date(t.date) as tx_day,
            SUM(t.base_amount) as daily_sum
        FROM transactions t
        WHERE t.workspace_id = p_workspace_id
        AND t.date >= p_start_date
        AND t.date <= p_end_date
        GROUP BY 1
    )
    SELECT 
        d.day::DATE,
        (v_initial_balance + SUM(COALESCE(dc.daily_sum, 0)) OVER (ORDER BY d.day))::NUMERIC as balance
    FROM generate_series(p_start_date::date, p_end_date::date, '1 day'::interval) d(day)
    LEFT JOIN daily_changes dc ON dc.tx_day = d.day
    ORDER BY d.day;
END;
$$;

-- 4. Get Unique Vendors (Optimized)
CREATE OR REPLACE FUNCTION get_unique_vendors(
    p_workspace_id UUID
)
RETURNS TABLE (vendor_name TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    -- Combine active vendors from persistent table AND fallback to distinct transactions
    -- to ensure we catch everything during migration period
    SELECT name FROM workspace_vendors WHERE workspace_id = p_workspace_id
    UNION
    SELECT DISTINCT vendor FROM transactions 
    WHERE workspace_id = p_workspace_id 
    AND vendor IS NOT NULL 
    AND vendor != ''
    ORDER BY 1;
$$;
