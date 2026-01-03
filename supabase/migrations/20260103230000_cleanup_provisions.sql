-- CLEANUP FOR UNIFIED BUDGET MODULE
-- Drops legacy tables and columns after migrating to the new budget module

-- 1. Drop provisions related tables
DROP TABLE IF EXISTS provision_ledger CASCADE;
DROP TABLE IF EXISTS provisions CASCADE;

-- 2. Clean up transactions table
ALTER TABLE transactions 
DROP COLUMN IF EXISTS provision_id,
DROP COLUMN IF EXISTS consume_provision,
DROP COLUMN IF EXISTS is_provision_funding;

-- 3. Clean up subcategories table
ALTER TABLE subcategories 
DROP COLUMN IF EXISTS funding_mode;

-- 4. Clean up enums if they are only used by provisions
-- (Be careful not to drop enums used by other features)
-- The 'funding_mode' enum was used by subcategories.
DROP TYPE IF EXISTS funding_mode;
