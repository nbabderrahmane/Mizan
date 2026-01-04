-- Migration: Add is_recurring column to budget_payg_configs
-- This allows PAYG budgets to auto-reset at the start of each calendar month

ALTER TABLE budget_payg_configs
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN budget_payg_configs.is_recurring IS 'If true, this PAYG budget will automatically re-budget at the start of each calendar month';
