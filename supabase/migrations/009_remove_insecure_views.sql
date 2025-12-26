-- Fix security issue: Remove views that bypass RLS
-- Issue: Views like user_groups_with_stats don't respect RLS policies
-- and can expose data users shouldn't see.
--
-- Solution: Drop the views since we're using SECURITY DEFINER functions
-- like get_user_groups() which properly check permissions.

-- Drop views that bypass RLS
DROP VIEW IF EXISTS user_groups_with_stats CASCADE;
DROP VIEW IF EXISTS active_games_with_stats CASCADE;
DROP VIEW IF EXISTS user_participation_summary CASCADE;
DROP VIEW IF EXISTS recent_games_detailed CASCADE;

-- Update get_user_groups to not depend on the view
-- Instead, query directly with proper filtering
CREATE OR REPLACE FUNCTION get_user_groups(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  avatar_url TEXT,
  settings JSONB,
  member_count BIGINT,
  active_games_count BIGINT,
  total_games_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.description,
    g.created_by,
    g.created_at,
    g.avatar_url,
    g.settings,
    (SELECT COUNT(*) FROM group_members WHERE group_id = g.id)::BIGINT as member_count,
    (SELECT COUNT(*) FROM game_instances WHERE group_id = g.id AND status = 'active')::BIGINT as active_games_count,
    (SELECT COUNT(*) FROM game_instances WHERE group_id = g.id)::BIGINT as total_games_count
  FROM groups g
  WHERE EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = g.id
    AND user_id = p_user_id
  )
  ORDER BY g.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Update get_group_game_history to not depend on view
CREATE OR REPLACE FUNCTION get_group_game_history(
  p_group_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  game_type TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT,
  current_phase TEXT,
  prompt TEXT,
  group_id UUID,
  group_name TEXT,
  member_count BIGINT,
  response_count BIGINT,
  vote_count BIGINT,
  thread_id UUID,
  comment_count BIGINT
) AS $$
BEGIN
  -- Verify user has access to this group
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = p_group_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied to group';
  END IF;

  RETURN QUERY
  SELECT
    gi.id,
    gi.game_type,
    gi.created_at,
    gi.expires_at,
    gi.status,
    gi.current_phase,
    gi.prompt,
    g.id as group_id,
    g.name as group_name,
    (SELECT COUNT(*) FROM group_members WHERE group_members.group_id = g.id)::BIGINT as member_count,
    (SELECT COUNT(*) FROM game_responses WHERE game_instance_id = gi.id)::BIGINT as response_count,
    (SELECT COUNT(*) FROM game_votes WHERE game_instance_id = gi.id)::BIGINT as vote_count,
    t.id as thread_id,
    (SELECT COUNT(*) FROM comments WHERE comments.thread_id = t.id)::BIGINT as comment_count
  FROM game_instances gi
  JOIN groups g ON g.id = gi.group_id
  LEFT JOIN threads t ON t.reference_id = gi.id AND t.type = 'game_instance'
  WHERE gi.group_id = p_group_id
  ORDER BY gi.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_groups(UUID) IS 'Securely gets all groups for a user with stats, respecting permissions';
COMMENT ON FUNCTION get_group_game_history(UUID, INTEGER, INTEGER) IS 'Securely gets paginated game history for a group with access check';
