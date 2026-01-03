-- ============================================================================
-- Mizan Database Schema - 001_initial_schema.sql
-- ============================================================================
-- Core tables for the shared budgeting application.
-- Run this migration first, then 002_rls_policies.sql, then 003_functions_triggers.sql
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Workspace member roles
CREATE TYPE workspace_role AS ENUM ('OWNER', 'MANAGER', 'CONTRIBUTOR', 'VIEWER');

-- Global admin roles (support super-admin)
CREATE TYPE admin_role AS ENUM ('SUPPORT_ADMIN');

-- Account types
CREATE TYPE account_type AS ENUM ('bank', 'cash', 'savings', 'investment');

-- Subcategory funding modes
CREATE TYPE funding_mode AS ENUM ('PAYG', 'PROVISION');

-- Provision cadence
CREATE TYPE provision_cadence AS ENUM ('monthly', 'quarterly', 'yearly', 'custom_months');

-- Provision status
CREATE TYPE provision_status AS ENUM ('active', 'paused', 'archived');

-- Provision ledger entry types
CREATE TYPE provision_entry_type AS ENUM ('fund', 'consume', 'adjust', 'release');

-- Transaction types
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');

-- Notification types
CREATE TYPE notification_type AS ENUM ('invite', 'system');

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. Profiles (linked to auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    must_change_password BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. App Admins (support super-admin - GOD role renamed to SUPPORT_ADMIN)
CREATE TABLE app_admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role admin_role NOT NULL DEFAULT 'SUPPORT_ADMIN',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Workspaces
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Workspace Members
CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role workspace_role NOT NULL DEFAULT 'VIEWER',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

-- Index for quick lookup of user's workspaces
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);

-- 5. Accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type account_type NOT NULL,
    base_currency CHAR(3) NOT NULL,
    opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for workspace lookups
CREATE INDEX idx_accounts_workspace_id ON accounts(workspace_id);

-- 6. Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_workspace_id ON categories(workspace_id);

-- 7. Subcategories
CREATE TABLE subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    funding_mode funding_mode DEFAULT 'PAYG',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subcategories_workspace_id ON subcategories(workspace_id);
CREATE INDEX idx_subcategories_category_id ON subcategories(category_id);

-- 8. Monthly Budgets
CREATE TABLE monthly_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- Normalized to first day of month
    subcategory_id UUID NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
    planned_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (workspace_id, month, subcategory_id)
);

CREATE INDEX idx_monthly_budgets_workspace_month ON monthly_budgets(workspace_id, month);

-- 9. Provisions
CREATE TABLE provisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    subcategory_id UUID NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
    reserved_account_id UUID NOT NULL REFERENCES accounts(id),
    cadence provision_cadence NOT NULL DEFAULT 'monthly',
    cadence_interval_months INTEGER, -- For custom_months cadence
    funding_amount_per_period NUMERIC(15,2) NOT NULL,
    next_due_date DATE NOT NULL,
    status provision_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_provisions_workspace_id ON provisions(workspace_id);
CREATE INDEX idx_provisions_reserved_account_id ON provisions(reserved_account_id);

-- 10. Provision Ledger
CREATE TABLE provision_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    provision_id UUID NOT NULL REFERENCES provisions(id) ON DELETE CASCADE,
    entry_type provision_entry_type NOT NULL,
    amount_in_reserved_account_currency NUMERIC(15,2) NOT NULL, -- Always positive
    related_transaction_id UUID, -- Will reference transactions, set after transactions table
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_provision_ledger_workspace_id ON provision_ledger(workspace_id);
CREATE INDEX idx_provision_ledger_provision_id ON provision_ledger(provision_id);

-- 11. Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    attributed_to_user_id UUID REFERENCES auth.users(id), -- Defaults to created_by
    type transaction_type NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id),
    subcategory_id UUID REFERENCES subcategories(id),
    transfer_account_id UUID REFERENCES accounts(id), -- For transfer type
    original_amount NUMERIC(15,2) NOT NULL,
    original_currency CHAR(3) NOT NULL,
    fx_rate_used NUMERIC(18,8), -- Exchange rate if different currency
    base_amount NUMERIC(15,2) NOT NULL, -- In account's base currency (signed: positive for income, negative for expense)
    consume_provision BOOLEAN DEFAULT FALSE,
    provision_id UUID REFERENCES provisions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for provision_ledger.related_transaction_id
ALTER TABLE provision_ledger 
    ADD CONSTRAINT fk_provision_ledger_transaction 
    FOREIGN KEY (related_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;

-- Indexes for transactions (hot table)
CREATE INDEX idx_transactions_workspace_id ON transactions(workspace_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_workspace_date ON transactions(workspace_id, date);
CREATE INDEX idx_transactions_created_by ON transactions(created_by);

-- 12. Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    href TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- 13. Invites
CREATE TABLE invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    role workspace_role NOT NULL DEFAULT 'VIEWER',
    token TEXT NOT NULL UNIQUE,
    invited_email TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_by_user_id UUID REFERENCES auth.users(id),
    accepted_at TIMESTAMPTZ
);

CREATE INDEX idx_invites_workspace_id ON invites(workspace_id);
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_invited_email ON invites(invited_email);

-- 14. Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    actor_user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    payload_public JSONB DEFAULT '{}', -- Non-sensitive metadata
    payload_sensitive JSONB, -- Sensitive data (amounts, etc.) - only for OWNER/MANAGER
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_workspace_id ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- 15. FX Rates Cache
CREATE TABLE fx_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_currency CHAR(3) NOT NULL,
    quote_currency CHAR(3) NOT NULL,
    rate NUMERIC(18,8) NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE (base_currency, quote_currency)
);

CREATE INDEX idx_fx_rates_currencies ON fx_rates(base_currency, quote_currency);
CREATE INDEX idx_fx_rates_expires_at ON fx_rates(expires_at);

-- ============================================================================
-- COMMENTS (for documentation)
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles linked to Supabase auth.users';
COMMENT ON TABLE app_admins IS 'Global support admins who can view metadata but not financial data';
COMMENT ON TABLE workspaces IS 'Shared budget workspaces (family/team budgets)';
COMMENT ON TABLE workspace_members IS 'Membership linking users to workspaces with roles';
COMMENT ON TABLE accounts IS 'Financial accounts (bank, cash, savings, investment)';
COMMENT ON TABLE categories IS 'Budget categories for organizing expenses';
COMMENT ON TABLE subcategories IS 'Budget subcategories with funding mode (PAYG or PROVISION)';
COMMENT ON TABLE monthly_budgets IS 'Planned budget amounts per subcategory per month';
COMMENT ON TABLE provisions IS 'Future bills funded over time (reserved from specific account)';
COMMENT ON TABLE provision_ledger IS 'Tracks provision funding, consumption, adjustments';
COMMENT ON TABLE transactions IS 'Income, expense, and transfer transactions';
COMMENT ON TABLE notifications IS 'In-app notifications for users';
COMMENT ON TABLE invites IS 'Workspace invite tokens';
COMMENT ON TABLE audit_logs IS 'Audit trail for all mutations';
COMMENT ON TABLE fx_rates IS 'Cached foreign exchange rates (12h expiry)';

COMMENT ON COLUMN transactions.base_amount IS 'Amount in account base currency. Positive for income, negative for expense.';
COMMENT ON COLUMN provision_ledger.amount_in_reserved_account_currency IS 'Always positive. Entry type determines if its add or subtract.';
COMMENT ON COLUMN audit_logs.payload_sensitive IS 'Contains amounts and financial data - only visible to OWNER/MANAGER';
