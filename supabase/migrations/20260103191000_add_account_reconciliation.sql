-- Add last_reconciled_date to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_reconciled_date DATE;

COMMENT ON COLUMN accounts.last_reconciled_date IS 'Date of the last reconciliation. Transactions on or before this date cannot be modified.';
