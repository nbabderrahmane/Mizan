-- Migration: Add currency column to workspaces table

ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD' NOT NULL;

-- Optional: Add a check constraint to ensure valid currency codes if needed
-- ALTER TABLE public.workspaces ADD CONSTRAINT valid_currency CHECK (length(currency) = 3);
