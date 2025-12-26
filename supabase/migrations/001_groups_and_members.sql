-- ==========================================
-- MIGRATION 001: Groups and Members
-- ==========================================
-- Description: Creates core group functionality for social games
-- Run this first!

-- ==========================================
-- TABLES
-- ==========================================

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) >= 3 AND length(name) <= 50),
  description TEXT CHECK (length(description) <= 500),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  avatar_url TEXT DEFAULT '',
  settings JSONB NOT NULL DEFAULT '{
    "enabled_games": ["would_you_rather", "hot_takes", "guess_who_said_it", "most_likely_to"],
    "notification_time": "09:00",
    "timezone": "UTC"
  }'::jsonb
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- Group invitations table
CREATE TABLE IF NOT EXISTS group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  CONSTRAINT invited_user_or_email CHECK (
    (invited_user_id IS NOT NULL AND email IS NULL) OR
    (invited_user_id IS NULL AND email IS NOT NULL)
  )
);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_status ON group_invitations(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_group_invitations_user ON group_invitations(invited_user_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;

-- Groups: Can view if you're a member
CREATE POLICY "Users can view groups they belong to"
  ON groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

-- Groups: Can create new groups (creator automatically becomes admin)
CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Groups: Admins can update
CREATE POLICY "Group admins can update groups"
  ON groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Groups: Admins can delete
CREATE POLICY "Group admins can delete groups"
  ON groups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Group members: Can view members of your groups
CREATE POLICY "Users can view members of their groups"
  ON group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

-- Group members: Admins can add members
CREATE POLICY "Group admins can add members"
  ON group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

-- Group members: Admins can update member roles
CREATE POLICY "Group admins can update member roles"
  ON group_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

-- Group members: Admins can remove members, or members can remove themselves
CREATE POLICY "Group admins can remove members or self-remove"
  ON group_members FOR DELETE
  USING (
    group_members.user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

-- Invitations: Can view if you're the inviter, invitee, or group member
CREATE POLICY "Users can view relevant invitations"
  ON group_invitations FOR SELECT
  USING (
    invited_by = auth.uid() OR
    invited_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_invitations.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Invitations: Group members can create invitations
CREATE POLICY "Group members can create invitations"
  ON group_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_invitations.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Invitations: Invitee can update (accept/decline)
CREATE POLICY "Invitees can update invitation status"
  ON group_invitations FOR UPDATE
  USING (invited_user_id = auth.uid());

-- ==========================================
-- FUNCTIONS
-- ==========================================

-- Function to automatically add creator as admin when creating a group
CREATE OR REPLACE FUNCTION add_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run the function after group creation
CREATE TRIGGER on_group_created
  AFTER INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_as_admin();

-- Function to handle invitation acceptance
CREATE OR REPLACE FUNCTION accept_group_invitation(invitation_id UUID)
RETURNS void AS $$
DECLARE
  inv_record RECORD;
BEGIN
  -- Get invitation details
  SELECT * INTO inv_record
  FROM group_invitations
  WHERE id = invitation_id
  AND invited_user_id = auth.uid()
  AND status = 'pending'
  AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Add user to group
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (inv_record.group_id, inv_record.invited_user_id, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  -- Update invitation status
  UPDATE group_invitations
  SET status = 'accepted'
  WHERE id = invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON TABLE groups IS 'Friend groups that play daily social games together';
COMMENT ON TABLE group_members IS 'Members of each group with their role (admin or member)';
COMMENT ON TABLE group_invitations IS 'Pending invitations to join groups';
COMMENT ON FUNCTION add_creator_as_admin() IS 'Automatically adds group creator as admin member';
COMMENT ON FUNCTION accept_group_invitation(UUID) IS 'Handles accepting a group invitation and adding user as member';
