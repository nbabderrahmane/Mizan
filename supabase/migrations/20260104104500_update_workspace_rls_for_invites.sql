-- Allow users to see workspace names if they have an invite
CREATE POLICY "workspaces_select_invitee"
ON workspaces FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM invites
        WHERE invites.workspace_id = workspaces.id
        AND (
            invites.token IS NOT NULL
            OR invites.invited_email = (SELECT email FROM profiles WHERE id = auth.uid())
        )
    )
);
