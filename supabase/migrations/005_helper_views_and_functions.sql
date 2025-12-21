-- ==========================================
-- MIGRATION 005: Helper Views and Functions
-- ==========================================
-- Description: Useful views and utility functions for the app
-- Run this after 004_threads_integration.sql

-- ==========================================
-- USEFUL VIEWS
-- ==========================================

-- View: User's groups with member counts
CREATE OR REPLACE VIEW user_groups_with_stats AS
SELECT
  g.*,
  (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
  (SELECT COUNT(*) FROM game_instances WHERE group_id = g.id AND status = 'active') as active_games_count,
  (SELECT COUNT(*) FROM game_instances WHERE group_id = g.id) as total_games_count
FROM groups g;

-- View: Active games with participation stats
CREATE OR REPLACE VIEW active_games_with_stats AS
SELECT
  gi.*,
  g.name as group_name,
  (SELECT COUNT(*) FROM group_members WHERE group_id = gi.group_id) as total_members,
  (SELECT COUNT(*) FROM game_responses WHERE game_instance_id = gi.id) as response_count,
  (SELECT COUNT(*) FROM game_votes WHERE game_instance_id = gi.id) as vote_count,
  (
    (SELECT COUNT(*) FROM game_responses WHERE game_instance_id = gi.id)::FLOAT /
    NULLIF((SELECT COUNT(*) FROM group_members WHERE group_id = gi.group_id), 0)
  ) as participation_rate
FROM game_instances gi
JOIN groups g ON g.id = gi.group_id
WHERE gi.status = 'active';

-- View: User participation summary
CREATE OR REPLACE VIEW user_participation_summary AS
SELECT
  gm.user_id,
  gm.group_id,
  g.name as group_name,
  COUNT(DISTINCT gr.game_instance_id) as games_responded,
  COUNT(DISTINCT gv.game_instance_id) as games_voted,
  COALESCE(SUM(gus.score), 0) as total_score
FROM group_members gm
JOIN groups g ON g.id = gm.group_id
LEFT JOIN game_responses gr ON gr.user_id = gm.user_id
LEFT JOIN game_votes gv ON gv.voter_id = gm.user_id
LEFT JOIN game_user_scores gus ON gus.user_id = gm.user_id
GROUP BY gm.user_id, gm.group_id, g.name;

-- View: Recent games with full details
CREATE OR REPLACE VIEW recent_games_detailed AS
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
  (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
  (SELECT COUNT(*) FROM game_responses WHERE game_instance_id = gi.id) as response_count,
  (SELECT COUNT(*) FROM game_votes WHERE game_instance_id = gi.id) as vote_count,
  t.id as thread_id,
  (SELECT COUNT(*) FROM comments WHERE thread_id = t.id) as comment_count
FROM game_instances gi
JOIN groups g ON g.id = gi.group_id
LEFT JOIN threads t ON t.reference_id = gi.id AND t.type = 'game_instance'
ORDER BY gi.created_at DESC;

-- ==========================================
-- UTILITY FUNCTIONS
-- ==========================================

-- Get user's groups
CREATE OR REPLACE FUNCTION get_user_groups(p_user_id UUID)
RETURNS SETOF user_groups_with_stats AS $$
BEGIN
  RETURN QUERY
  SELECT ugs.*
  FROM user_groups_with_stats ugs
  WHERE EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = ugs.id
    AND user_id = p_user_id
  )
  ORDER BY ugs.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get group's game history
CREATE OR REPLACE FUNCTION get_group_game_history(
  p_group_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF recent_games_detailed AS $$
BEGIN
  RETURN QUERY
  SELECT rgd.*
  FROM recent_games_detailed rgd
  WHERE rgd.group_id = p_group_id
  ORDER BY rgd.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if user can access game
CREATE OR REPLACE FUNCTION user_can_access_game(
  p_user_id UUID,
  p_game_instance_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM game_instances gi
    JOIN group_members gm ON gm.group_id = gi.group_id
    WHERE gi.id = p_game_instance_id
    AND gm.user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Get user's pending games (not yet responded)
CREATE OR REPLACE FUNCTION get_pending_games_for_user(p_user_id UUID)
RETURNS SETOF game_instances AS $$
BEGIN
  RETURN QUERY
  SELECT gi.*
  FROM game_instances gi
  JOIN group_members gm ON gm.group_id = gi.group_id
  WHERE gm.user_id = p_user_id
  AND gi.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM game_responses
    WHERE game_instance_id = gi.id
    AND user_id = p_user_id
  )
  ORDER BY gi.expires_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get game results summary
CREATE OR REPLACE FUNCTION get_game_results(p_game_instance_id UUID)
RETURNS TABLE (
  game_type TEXT,
  total_responses BIGINT,
  total_votes BIGINT,
  top_scorers JSONB,
  response_summary JSONB,
  vote_summary JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gi.game_type,
    (SELECT COUNT(*) FROM game_responses WHERE game_instance_id = p_game_instance_id),
    (SELECT COUNT(*) FROM game_votes WHERE game_instance_id = p_game_instance_id),
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'user_id', gus.user_id,
          'score', gus.score,
          'breakdown', gus.score_breakdown
        ) ORDER BY gus.score DESC
      )
      FROM game_user_scores gus
      WHERE gus.game_instance_id = p_game_instance_id
      LIMIT 5
    ),
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'user_id', gr.user_id,
          'response', gr.response_data,
          'intensity', gr.intensity_score
        )
      )
      FROM game_responses gr
      WHERE gr.game_instance_id = p_game_instance_id
    ),
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'voter_id', gv.voter_id,
          'voted_option', gv.voted_option,
          'voted_for_user', gv.voted_for_user_id
        )
      )
      FROM game_votes gv
      WHERE gv.game_instance_id = p_game_instance_id
    )
  FROM game_instances gi
  WHERE gi.id = p_game_instance_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Mark game as completed
CREATE OR REPLACE FUNCTION complete_game(p_game_instance_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE game_instances
  SET status = 'completed'
  WHERE id = p_game_instance_id;
END;
$$ LANGUAGE plpgsql;

-- Get group member list with stats
CREATE OR REPLACE FUNCTION get_group_members_with_stats(p_group_id UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  role TEXT,
  joined_at TIMESTAMPTZ,
  total_score BIGINT,
  games_played BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    gm.role,
    gm.joined_at,
    COALESCE(SUM(gus.score), 0)::BIGINT as total_score,
    COUNT(DISTINCT gus.game_instance_id)::BIGINT as games_played
  FROM group_members gm
  JOIN profiles p ON p.id = gm.user_id
  LEFT JOIN game_user_scores gus ON gus.user_id = gm.user_id
  LEFT JOIN game_instances gi ON gi.id = gus.game_instance_id AND gi.group_id = p_group_id
  WHERE gm.group_id = p_group_id
  GROUP BY p.id, p.username, p.avatar_url, gm.role, gm.joined_at
  ORDER BY total_score DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ==========================================
-- BATCH OPERATIONS
-- ==========================================

-- Award participation points to all responders
CREATE OR REPLACE FUNCTION award_participation_points(p_game_instance_id UUID)
RETURNS INTEGER AS $$
DECLARE
  awarded_count INTEGER := 0;
BEGIN
  INSERT INTO game_user_scores (game_instance_id, user_id, score, score_breakdown)
  SELECT
    p_game_instance_id,
    user_id,
    1,
    '{"participation": 1}'::jsonb
  FROM game_responses
  WHERE game_instance_id = p_game_instance_id
  ON CONFLICT (game_instance_id, user_id) DO NOTHING;

  GET DIAGNOSTICS awarded_count = ROW_COUNT;
  RETURN awarded_count;
END;
$$ LANGUAGE plpgsql;

-- Send reminder to non-responders (placeholder - will be implemented in Edge Function)
CREATE OR REPLACE FUNCTION get_non_responders(p_game_instance_id UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username
  FROM group_members gm
  JOIN profiles p ON p.id = gm.user_id
  JOIN game_instances gi ON gi.group_id = gm.group_id
  WHERE gi.id = p_game_instance_id
  AND NOT EXISTS (
    SELECT 1 FROM game_responses
    WHERE game_instance_id = p_game_instance_id
    AND user_id = gm.user_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON VIEW user_groups_with_stats IS 'User groups with member and game counts';
COMMENT ON VIEW active_games_with_stats IS 'Active games with participation statistics';
COMMENT ON VIEW user_participation_summary IS 'Summary of user participation across groups';
COMMENT ON VIEW recent_games_detailed IS 'Recent games with full details and stats';

COMMENT ON FUNCTION get_user_groups(UUID) IS 'Gets all groups for a user with stats';
COMMENT ON FUNCTION get_group_game_history(UUID, INTEGER, INTEGER) IS 'Gets paginated game history for a group';
COMMENT ON FUNCTION user_can_access_game(UUID, UUID) IS 'Checks if user is member of game group';
COMMENT ON FUNCTION get_pending_games_for_user(UUID) IS 'Gets active games user has not responded to yet';
COMMENT ON FUNCTION get_game_results(UUID) IS 'Gets comprehensive results summary for a game';
COMMENT ON FUNCTION complete_game(UUID) IS 'Marks a game as completed';
COMMENT ON FUNCTION get_group_members_with_stats(UUID) IS 'Gets group members with their scores and participation';
COMMENT ON FUNCTION award_participation_points(UUID) IS 'Awards 1 point to all users who responded to a game';
COMMENT ON FUNCTION get_non_responders(UUID) IS 'Gets list of group members who have not responded to a game';
