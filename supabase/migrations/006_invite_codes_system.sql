-- ==========================================
-- MIGRATION 006: Invite Codes System
-- ==========================================
-- Description: Adds shareable invite codes for groups
-- Run this after 005_helper_views_and_functions.sql

-- ==========================================
-- TABLES
-- ==========================================

-- Group invite codes
CREATE TABLE IF NOT EXISTS group_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE, -- The shareable code (e.g., "abc123xyz")
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = never expires
  max_uses INTEGER, -- NULL = unlimited uses
  uses_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON group_invite_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_invite_codes_group ON group_invite_codes(group_id);

-- Track who joined via which code
CREATE TABLE IF NOT EXISTS invite_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id UUID NOT NULL REFERENCES group_invite_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(invite_code_id, user_id) -- Can't use same code twice
);

CREATE INDEX IF NOT EXISTS idx_invite_code_uses_code ON invite_code_uses(invite_code_id);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE group_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_code_uses ENABLE ROW LEVEL SECURITY;

-- Anyone can view active invite codes (needed to join)
CREATE POLICY "Anyone can view active invite codes"
  ON group_invite_codes FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Group members can view all codes for their group
CREATE POLICY "Members can view group invite codes"
  ON group_invite_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_invite_codes.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Admins can create invite codes
CREATE POLICY "Admins can create invite codes"
  ON group_invite_codes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_invite_codes.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Admins can deactivate codes
CREATE POLICY "Admins can update invite codes"
  ON group_invite_codes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_invite_codes.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Members can view code usage stats
CREATE POLICY "Members can view code uses"
  ON invite_code_uses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_invite_codes gic
      JOIN group_members gm ON gm.group_id = gic.group_id
      WHERE gic.id = invite_code_uses.invite_code_id
      AND gm.user_id = auth.uid()
    )
  );

-- ==========================================
-- FUNCTIONS
-- ==========================================

-- Generate random invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create invite code for a group
CREATE OR REPLACE FUNCTION create_group_invite_code(
  p_group_id UUID,
  p_expires_in_days INTEGER DEFAULT NULL,
  p_max_uses INTEGER DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_expires_at TIMESTAMPTZ;
  v_user_id UUID := auth.uid();
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
    AND user_id = v_user_id
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can create invite codes';
  END IF;

  -- Generate unique code
  LOOP
    v_code := generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM group_invite_codes WHERE code = v_code);
  END LOOP;

  -- Calculate expiration
  IF p_expires_in_days IS NOT NULL THEN
    v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;
  END IF;

  -- Insert code
  INSERT INTO group_invite_codes (
    group_id,
    code,
    created_by,
    expires_at,
    max_uses
  ) VALUES (
    p_group_id,
    v_code,
    v_user_id,
    v_expires_at,
    p_max_uses
  );

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Join group via invite code
CREATE OR REPLACE FUNCTION join_group_via_code(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_invite_code RECORD;
  v_user_id UUID := auth.uid();
  v_result JSONB;
BEGIN
  -- Get invite code details
  SELECT * INTO v_invite_code
  FROM group_invite_codes
  WHERE code = p_code
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invite code'
    );
  END IF;

  -- Check max uses
  IF v_invite_code.max_uses IS NOT NULL AND v_invite_code.uses_count >= v_invite_code.max_uses THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invite code has reached maximum uses'
    );
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = v_invite_code.group_id
    AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are already a member of this group'
    );
  END IF;

  -- Add user to group
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_invite_code.group_id, v_user_id, 'member');

  -- Track code usage
  INSERT INTO invite_code_uses (invite_code_id, user_id)
  VALUES (v_invite_code.id, v_user_id);

  -- Increment uses count
  UPDATE group_invite_codes
  SET uses_count = uses_count + 1
  WHERE id = v_invite_code.id;

  -- Return success with group info
  SELECT jsonb_build_object(
    'success', true,
    'group_id', g.id,
    'group_name', g.name,
    'group_description', g.description
  ) INTO v_result
  FROM groups g
  WHERE g.id = v_invite_code.group_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deactivate invite code
CREATE OR REPLACE FUNCTION deactivate_invite_code(p_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  UPDATE group_invite_codes
  SET is_active = false
  WHERE code = p_code
  AND EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_invite_codes.group_id
    AND group_members.user_id = v_user_id
    AND group_members.role = 'admin'
  );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get group info from invite code (for preview before joining)
CREATE OR REPLACE FUNCTION get_group_from_invite_code(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'group_id', g.id,
    'group_name', g.name,
    'group_description', g.description,
    'member_count', (SELECT COUNT(*) FROM group_members WHERE group_id = g.id),
    'is_active', gic.is_active,
    'expires_at', gic.expires_at,
    'uses_count', gic.uses_count,
    'max_uses', gic.max_uses
  ) INTO v_result
  FROM group_invite_codes gic
  JOIN groups g ON g.id = gic.group_id
  WHERE gic.code = p_code
  AND gic.is_active = true
  AND (gic.expires_at IS NULL OR gic.expires_at > NOW());

  RETURN COALESCE(v_result, jsonb_build_object('error', 'Invalid or expired invite code'));
END;
$$ LANGUAGE plpgsql STABLE;

-- ==========================================
-- VIEWS
-- ==========================================

-- View invite codes with usage stats
CREATE OR REPLACE VIEW group_invite_codes_with_stats AS
SELECT
  gic.*,
  g.name as group_name,
  p.username as created_by_username,
  (SELECT COUNT(*) FROM invite_code_uses WHERE invite_code_id = gic.id) as actual_uses
FROM group_invite_codes gic
JOIN groups g ON g.id = gic.group_id
JOIN profiles p ON p.id = gic.created_by;

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON TABLE group_invite_codes IS 'Shareable invite codes for joining groups';
COMMENT ON TABLE invite_code_uses IS 'Tracks which users used which invite codes';

COMMENT ON FUNCTION generate_invite_code() IS 'Generates random 8-character invite code';
COMMENT ON FUNCTION create_group_invite_code(UUID, INTEGER, INTEGER) IS 'Creates a new invite code for a group';
COMMENT ON FUNCTION join_group_via_code(TEXT) IS 'Join a group using an invite code';
COMMENT ON FUNCTION deactivate_invite_code(TEXT) IS 'Deactivate an invite code (admin only)';
COMMENT ON FUNCTION get_group_from_invite_code(TEXT) IS 'Get group info from invite code without joining';
