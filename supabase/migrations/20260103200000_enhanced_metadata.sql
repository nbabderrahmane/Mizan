-- Enhanced Metadata Migration

-- 1. Transactions: Add Title and Vendor
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS vendor TEXT;

-- 2. Categories: Add Type (Income vs Expense filtering)
-- Uses existing 'transaction_type' enum ('income', 'expense', 'transfer')
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS type transaction_type;

-- 3. Profiles: Split Full Name into First/Last
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Data Migration for Profiles
-- Split 'full_name' by the first space. 
-- Everything before first space is first_name, everything after is last_name.
-- If no space, last_name is null.
UPDATE profiles
SET 
  first_name = split_part(full_name, ' ', 1),
  last_name = NULLIF(substring(full_name from position(' ' in full_name) + 1), '');

-- Optional: Drop full_name later. keeping for backward compatibility for now.
