-- Unified Budget Migration
-- This migration sets up the new infrastructure for PAYG and Plan & Spend budgets.

-- 1. Create necessary enums (with safety checks)
DO $$ BEGIN
    CREATE TYPE budget_type AS ENUM ('PAYG', 'PLAN_SPEND');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE budget_status AS ENUM ('active', 'paused', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE budget_ledger_type AS ENUM ('fund', 'consume', 'release', 'adjust');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create budgets table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budgets') THEN
        CREATE TABLE budgets (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            subcategory_id UUID NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
            name TEXT,
            currency TEXT NOT NULL DEFAULT 'USD',
            type budget_type NOT NULL,
            status budget_status DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        -- Ensure subcategory_id exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='budgets' AND column_name='subcategory_id') THEN
            ALTER TABLE budgets ADD COLUMN subcategory_id UUID REFERENCES subcategories(id) ON DELETE CASCADE;
        END IF;
        -- Drop legacy category_id if present
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='budgets' AND column_name='category_id') THEN
            ALTER TABLE budgets DROP COLUMN IF EXISTS category_id;
        END IF;
        -- Ensure currency exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='budgets' AND column_name='currency') THEN
            ALTER TABLE budgets ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';
        END IF;
        -- Ensure subcategory_id is NOT NULL if it was just added
        ALTER TABLE budgets ALTER COLUMN subcategory_id SET NOT NULL;
    END IF;
END $$;

-- 3. PAYG Budget Config
CREATE TABLE IF NOT EXISTS budget_payg_configs (
    budget_id UUID PRIMARY KEY REFERENCES budgets(id) ON DELETE CASCADE,
    monthly_cap NUMERIC(15,2) NOT NULL
);

-- 4. Plan & Spend Budget Config
CREATE TABLE IF NOT EXISTS budget_plan_configs (
    budget_id UUID PRIMARY KEY REFERENCES budgets(id) ON DELETE CASCADE,
    target_amount NUMERIC(15,2) NOT NULL,
    due_date DATE NOT NULL,
    recurrence_type TEXT, -- Monthly, Quarterly, Semi-annual, Annual, None
    start_policy TEXT, -- start_this_month, start_next_month
    allow_use_safe BOOLEAN DEFAULT FALSE,
    surplus_handling TEXT DEFAULT 'rollover' -- rollover, release
);

-- 5. Budget Ledger
CREATE TABLE IF NOT EXISTS budget_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    type budget_ledger_type NOT NULL,
    amount NUMERIC(15,2) NOT NULL, -- Always positive
    date TIMESTAMPTZ DEFAULT NOW(),
    related_transaction_id UUID,
    created_by UUID REFERENCES auth.users(id),
    metadata JSONB
);

-- 6. Payments Due
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budget_payments_due') THEN
        CREATE TABLE budget_payments_due (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
            amount_expected NUMERIC(15,2) NOT NULL,
            due_date DATE NOT NULL,
            status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled
            confirmed_at TIMESTAMPTZ,
            transaction_id UUID,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='budget_payments_due' AND column_name='workspace_id') THEN
            ALTER TABLE budget_payments_due ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='budget_payments_due' AND column_name='related_transaction_id') THEN
            ALTER TABLE budget_payments_due RENAME COLUMN related_transaction_id TO transaction_id;
        END IF;
    END IF;
END $$;

-- 7. RLS Policies
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_payg_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_plan_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_payments_due ENABLE ROW LEVEL SECURITY;

-- Budgets
DROP POLICY IF EXISTS "budgets_select_member" ON budgets;
CREATE POLICY "budgets_select_member" ON budgets FOR SELECT USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "budgets_insert_manager" ON budgets;
CREATE POLICY "budgets_insert_manager" ON budgets FOR INSERT WITH CHECK (has_workspace_role(workspace_id, '{OWNER, MANAGER}'));
DROP POLICY IF EXISTS "budgets_update_manager" ON budgets;
CREATE POLICY "budgets_update_manager" ON budgets FOR UPDATE USING (has_workspace_role(workspace_id, '{OWNER, MANAGER}'));
DROP POLICY IF EXISTS "budgets_delete_manager" ON budgets;
CREATE POLICY "budgets_delete_manager" ON budgets FOR DELETE USING (has_workspace_role(workspace_id, '{OWNER, MANAGER}'));

-- Configs (Link to budgets)
DROP POLICY IF EXISTS "payg_config_select_member" ON budget_payg_configs;
CREATE POLICY "payg_config_select_member" ON budget_payg_configs FOR SELECT USING (EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_id AND is_workspace_member(b.workspace_id)));
DROP POLICY IF EXISTS "payg_config_all_manager" ON budget_payg_configs;
CREATE POLICY "payg_config_all_manager" ON budget_payg_configs FOR ALL USING (EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_id AND has_workspace_role(b.workspace_id, '{OWNER, MANAGER}')));

DROP POLICY IF EXISTS "plan_config_select_member" ON budget_plan_configs;
CREATE POLICY "plan_config_select_member" ON budget_plan_configs FOR SELECT USING (EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_id AND is_workspace_member(b.workspace_id)));
DROP POLICY IF EXISTS "plan_config_all_manager" ON budget_plan_configs;
CREATE POLICY "plan_config_all_manager" ON budget_plan_configs FOR ALL USING (EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_id AND has_workspace_role(b.workspace_id, '{OWNER, MANAGER}')));

-- Ledger
DROP POLICY IF EXISTS "budget_ledger_select_member" ON budget_ledger;
CREATE POLICY "budget_ledger_select_member" ON budget_ledger FOR SELECT USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "budget_ledger_insert_manager" ON budget_ledger;
CREATE POLICY "budget_ledger_insert_manager" ON budget_ledger FOR INSERT WITH CHECK (has_workspace_role(workspace_id, '{OWNER, MANAGER, CONTRIBUTOR}')); -- Contributor can add entries via Confirm Payment

-- Payments Due
DROP POLICY IF EXISTS "payments_due_select_member" ON budget_payments_due;
CREATE POLICY "payments_due_select_member" ON budget_payments_due FOR SELECT USING (EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_id AND is_workspace_member(b.workspace_id)));
DROP POLICY IF EXISTS "payments_due_all_manager" ON budget_payments_due;
CREATE POLICY "payments_due_all_manager" ON budget_payments_due FOR ALL USING (EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_id AND has_workspace_role(b.workspace_id, '{OWNER, MANAGER, CONTRIBUTOR}')));

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_budgets_workspace_id ON budgets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_budget_ledger_budget_id ON budget_ledger(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_ledger_workspace_id ON budget_ledger(workspace_id);
CREATE INDEX IF NOT EXISTS idx_budget_payments_due_budget_id ON budget_payments_due(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_payments_due_workspace_id ON budget_payments_due(workspace_id);
