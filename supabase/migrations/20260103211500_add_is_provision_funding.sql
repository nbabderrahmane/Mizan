-- Add is_provision_funding to transactions
-- This allows recording a "Funding" event in the transaction list without reducing the account balance.

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_provision_funding BOOLEAN DEFAULT FALSE;
