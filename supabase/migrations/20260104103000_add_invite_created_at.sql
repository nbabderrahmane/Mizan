-- Add created_at column to invites table
ALTER TABLE invites ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Update indexes for better sorting performance
CREATE INDEX IF NOT EXISTS idx_invites_created_at ON invites(created_at DESC);
