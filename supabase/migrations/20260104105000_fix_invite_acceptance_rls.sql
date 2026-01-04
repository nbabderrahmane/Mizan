-- Allow prospective members to accept their invitations
-- They need to update the invite to mark it as accepted by them
CREATE POLICY "invites_update_invitee"
ON invites FOR UPDATE
USING (
    accepted_at IS NULL 
    AND (
        invited_email IS NULL 
        OR LOWER(invited_email) = (SELECT LOWER(email) FROM profiles WHERE id = auth.uid())
    )
)
WITH CHECK (
    accepted_by_user_id = auth.uid()
    AND accepted_at IS NOT NULL
);

-- Allow new members to join a workspace if they have a valid, recently accepted invitation
CREATE POLICY "workspace_members_insert_invitee"
ON workspace_members FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM invites
        WHERE invites.workspace_id = workspace_members.workspace_id
        AND invites.accepted_by_user_id = auth.uid()
        AND invites.accepted_at > (now() - interval '5 minutes')
    )
);
