-- Add type column to workspaces
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'personal' CHECK (type IN ('personal', 'business'));

-- Comment
COMMENT ON COLUMN workspaces.type IS 'Type of workspace: personal or business. Affects defaults and available features.';
