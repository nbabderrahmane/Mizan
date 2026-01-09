-- Add metadata JSONB column to workspaces and budgets if not exists
-- Safe migration for V1.1 Onboarding

ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
