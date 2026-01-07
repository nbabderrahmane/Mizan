-- Migration: Persistent Vendors
-- Description: Creates a dedicated table for vendors to ensure they persist independently of transactions.

CREATE TABLE IF NOT EXISTS workspace_vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, name)
);

-- Enable RLS
ALTER TABLE workspace_vendors ENABLE ROW LEVEL SECURITY;

-- Policies for workspace members
CREATE POLICY "Workspace members can view vendors" ON workspace_vendors
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = workspace_vendors.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace members can insert vendors" ON workspace_vendors
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = workspace_vendors.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_workspace_vendors_workspace_id ON workspace_vendors(workspace_id);

-- Seed existing vendors from transactions
INSERT INTO workspace_vendors (workspace_id, name)
SELECT DISTINCT workspace_id, vendor
FROM transactions
WHERE vendor IS NOT NULL
ON CONFLICT (workspace_id, name) DO NOTHING;
