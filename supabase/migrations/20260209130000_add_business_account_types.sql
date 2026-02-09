-- Add business-specific account types to the enum
-- We use ALTER TYPE ... ADD VALUE which cannot be wrapped in a transaction block
-- so we execute them as separate statements.

-- 'purchase' for "Caisse Achats"
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'purchase';

-- 'g_a' for "Caisse G&A" (General & Administrative)
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'g_a';

-- 'logistics' for "Caisse Opérations" (Transport, Warehouse, etc.)
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'logistics';
