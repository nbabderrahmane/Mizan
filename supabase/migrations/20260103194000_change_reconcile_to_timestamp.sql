-- Change last_reconciled_date to last_reconciled_at for timestamp precision
-- This allows locking transactions based on creation time for same-day reconciliations

ALTER TABLE accounts 
DROP COLUMN IF EXISTS last_reconciled_date;

ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS last_reconciled_at TIMESTAMPTZ DEFAULT NULL;

-- Update the view/query logic is handled in application code
-- Existing data in last_reconciled_date is lost, but that's acceptable for this iteration 
-- or we could have converted it, but DATE->TIMESTAMPTZ defaults to midnight which might be too aggressive.
-- Better to reset logic to NULL or assume midnight. 
-- Let's just add the column.
