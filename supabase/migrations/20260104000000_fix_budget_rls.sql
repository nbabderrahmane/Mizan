-- Fix RLS for Budget Configurations by Denormalizing workspace_id
-- This ensures performant and robust visibility checks without recursive joins.

-- 1. Add workspace_id column to config tables
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='budget_payg_configs' AND column_name='workspace_id') THEN
        ALTER TABLE budget_payg_configs ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='budget_plan_configs' AND column_name='workspace_id') THEN
        ALTER TABLE budget_plan_configs ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Backfill workspace_id from existing budgets
UPDATE budget_payg_configs c
SET workspace_id = b.workspace_id
FROM budgets b
WHERE c.budget_id = b.id
AND c.workspace_id IS NULL;

UPDATE budget_plan_configs c
SET workspace_id = b.workspace_id
FROM budgets b
WHERE c.budget_id = b.id
AND c.workspace_id IS NULL;

-- 3. Enforce NOT NULL (after backfill)
ALTER TABLE budget_payg_configs ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE budget_plan_configs ALTER COLUMN workspace_id SET NOT NULL;

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_budget_payg_configs_workspace_id ON budget_payg_configs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_budget_plan_configs_workspace_id ON budget_plan_configs(workspace_id);

-- 5. Update RLS Policies to use workspace_id directly
-- PAYG Policies
DROP POLICY IF EXISTS "payg_config_select_member" ON budget_payg_configs;
CREATE POLICY "payg_config_select_member" ON budget_payg_configs FOR SELECT USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "payg_config_all_manager" ON budget_payg_configs;
CREATE POLICY "payg_config_all_manager" ON budget_payg_configs FOR ALL USING (has_workspace_role(workspace_id, '{OWNER, MANAGER}'));

-- Plan Policies
DROP POLICY IF EXISTS "plan_config_select_member" ON budget_plan_configs;
CREATE POLICY "plan_config_select_member" ON budget_plan_configs FOR SELECT USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "plan_config_all_manager" ON budget_plan_configs;
CREATE POLICY "plan_config_all_manager" ON budget_plan_configs FOR ALL USING (has_workspace_role(workspace_id, '{OWNER, MANAGER}'));
