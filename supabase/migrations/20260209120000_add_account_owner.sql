-- Add owner_user_id to accounts table safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'owner_user_id') THEN
        ALTER TABLE accounts ADD COLUMN owner_user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_accounts_owner_user_id ON accounts(owner_user_id);

-- Grant access to authenticated users
GRANT ALL ON accounts TO authenticated;

-- RLS: No new policies needed as workspace access is already controlled.
