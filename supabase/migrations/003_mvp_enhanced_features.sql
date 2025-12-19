-- ==========================================
-- MIGRATION 003: MVP Enhanced Features
-- ==========================================
-- Description: Adds analytics, scoring, debates, and phase management
-- Run this after 002_game_instances_core.sql

-- ==========================================
-- ANALYTICS & DISTRIBUTION
-- ==========================================

-- Game analytics table (for Would You Rather distribution curves)
CREATE TABLE IF NOT EXISTS game_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  analytics_type TEXT NOT NULL, -- 'distribution', 'outliers', 'consensus'
  data JSONB NOT NULL, -- Computed statistics
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_instance_id, analytics_type)
);

CREATE INDEX IF NOT EXISTS idx_game_analytics_instance ON game_analytics(game_instance_id);

ALTER TABLE game_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view game analytics"
  ON game_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_instances gi
      JOIN group_members gm ON gm.group_id = gi.group_id
      WHERE gi.id = game_analytics.game_instance_id
      AND gm.user_id = auth.uid()
    )
  );

-- ==========================================
-- DEBATE MATCHING (for Hot Takes)
-- ==========================================

-- Debate matches table
CREATE TABLE IF NOT EXISTS debate_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  user_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES threads(id), -- Link to discussion thread
  user_a_stance TEXT, -- 'agree' or 'disagree'
  user_b_stance TEXT,
  winner_id UUID REFERENCES profiles(id), -- Voted by group as most convincing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT CHECK (status IN ('active', 'completed')) DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_debate_matches_game ON debate_matches(game_instance_id);
CREATE INDEX IF NOT EXISTS idx_debate_matches_users ON debate_matches(user_a_id, user_b_id);

ALTER TABLE debate_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view debate matches"
  ON debate_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_instances gi
      JOIN group_members gm ON gm.group_id = gi.group_id
      WHERE gi.id = debate_matches.game_instance_id
      AND gm.user_id = auth.uid()
    )
  );

-- ==========================================
-- SCORING & LEADERBOARDS
-- ==========================================

-- User scores per game
CREATE TABLE IF NOT EXISTS game_user_scores (
  game_instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}'::jsonb, -- {'participation': 1, 'correct_guess': 5}
  PRIMARY KEY (game_instance_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_game_user_scores_lookup ON game_user_scores(user_id, game_instance_id);

ALTER TABLE game_user_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view game scores"
  ON game_user_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_instances gi
      JOIN group_members gm ON gm.group_id = gi.group_id
      WHERE gi.id = game_user_scores.game_instance_id
      AND gm.user_id = auth.uid()
    )
  );

-- Leaderboards
CREATE TABLE IF NOT EXISTS game_leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  game_type TEXT,
  timeframe TEXT CHECK (timeframe IN ('daily', 'weekly', 'monthly', 'all_time')),
  rankings JSONB NOT NULL, -- [{user_id, username, score, rank}]
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, game_type, timeframe)
);

CREATE INDEX IF NOT EXISTS idx_leaderboards_group_type ON game_leaderboards(group_id, game_type, timeframe);

ALTER TABLE game_leaderboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group leaderboards"
  ON game_leaderboards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = game_leaderboards.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- ==========================================
-- PHASE MANAGEMENT (for multi-phase games)
-- ==========================================

-- Phase history table
CREATE TABLE IF NOT EXISTS game_phase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_phase_history_game ON game_phase_history(game_instance_id);

ALTER TABLE game_phase_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view phase history"
  ON game_phase_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_instances gi
      JOIN group_members gm ON gm.group_id = gi.group_id
      WHERE gi.id = game_phase_history.game_instance_id
      AND gm.user_id = auth.uid()
    )
  );

-- ==========================================
-- FUNCTIONS FOR ANALYTICS
-- ==========================================

-- Calculate distribution for Would You Rather intensity scores
CREATE OR REPLACE FUNCTION calculate_intensity_distribution(p_game_instance_id UUID)
RETURNS void AS $$
DECLARE
  intensities INTEGER[];
  dist INTEGER[];
  mean_val NUMERIC;
  std_dev_val NUMERIC;
  outlier_threshold NUMERIC;
  analytics_data JSONB;
BEGIN
  -- Get all intensity scores
  SELECT ARRAY_AGG(intensity_score)
  INTO intensities
  FROM game_responses
  WHERE game_instance_id = p_game_instance_id
  AND intensity_score IS NOT NULL;

  IF intensities IS NULL OR array_length(intensities, 1) = 0 THEN
    RETURN;
  END IF;

  -- Calculate mean
  SELECT AVG(intensity_score)::NUMERIC
  INTO mean_val
  FROM game_responses
  WHERE game_instance_id = p_game_instance_id;

  -- Calculate standard deviation
  SELECT STDDEV(intensity_score)::NUMERIC
  INTO std_dev_val
  FROM game_responses
  WHERE game_instance_id = p_game_instance_id;

  -- Calculate distribution (count per intensity level)
  SELECT ARRAY[
    (SELECT COUNT(*) FROM unnest(intensities) WHERE unnest = 1),
    (SELECT COUNT(*) FROM unnest(intensities) WHERE unnest = 2),
    (SELECT COUNT(*) FROM unnest(intensities) WHERE unnest = 3),
    (SELECT COUNT(*) FROM unnest(intensities) WHERE unnest = 4),
    (SELECT COUNT(*) FROM unnest(intensities) WHERE unnest = 5),
    (SELECT COUNT(*) FROM unnest(intensities) WHERE unnest = 6),
    (SELECT COUNT(*) FROM unnest(intensities) WHERE unnest = 7),
    (SELECT COUNT(*) FROM unnest(intensities) WHERE unnest = 8),
    (SELECT COUNT(*) FROM unnest(intensities) WHERE unnest = 9),
    (SELECT COUNT(*) FROM unnest(intensities) WHERE unnest = 10)
  ] INTO dist;

  -- Build analytics JSON
  analytics_data := jsonb_build_object(
    'distribution', dist,
    'mean', mean_val,
    'std_dev', std_dev_val,
    'total_responses', array_length(intensities, 1)
  );

  -- Upsert analytics
  INSERT INTO game_analytics (game_instance_id, analytics_type, data)
  VALUES (p_game_instance_id, 'distribution', analytics_data)
  ON CONFLICT (game_instance_id, analytics_type)
  DO UPDATE SET data = analytics_data, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTIONS FOR SCORING
-- ==========================================

-- Award points to a user for a game
CREATE OR REPLACE FUNCTION award_game_points(
  p_game_instance_id UUID,
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT DEFAULT 'participation'
)
RETURNS void AS $$
BEGIN
  INSERT INTO game_user_scores (game_instance_id, user_id, score, score_breakdown)
  VALUES (
    p_game_instance_id,
    p_user_id,
    p_points,
    jsonb_build_object(p_reason, p_points)
  )
  ON CONFLICT (game_instance_id, user_id)
  DO UPDATE SET
    score = game_user_scores.score + p_points,
    score_breakdown = game_user_scores.score_breakdown || jsonb_build_object(p_reason, p_points);
END;
$$ LANGUAGE plpgsql;

-- Calculate leaderboard for a group
CREATE OR REPLACE FUNCTION calculate_leaderboard(
  p_group_id UUID,
  p_game_type TEXT DEFAULT NULL,
  p_timeframe TEXT DEFAULT 'all_time'
)
RETURNS void AS $$
DECLARE
  start_date TIMESTAMPTZ;
  rankings JSONB;
BEGIN
  -- Determine date range based on timeframe
  CASE p_timeframe
    WHEN 'daily' THEN start_date := NOW() - INTERVAL '1 day';
    WHEN 'weekly' THEN start_date := NOW() - INTERVAL '7 days';
    WHEN 'monthly' THEN start_date := NOW() - INTERVAL '30 days';
    ELSE start_date := '1970-01-01'::TIMESTAMPTZ; -- all_time
  END CASE;

  -- Calculate rankings
  WITH scored_games AS (
    SELECT
      gus.user_id,
      p.username,
      SUM(gus.score) as total_score
    FROM game_user_scores gus
    JOIN game_instances gi ON gi.id = gus.game_instance_id
    JOIN profiles p ON p.id = gus.user_id
    WHERE gi.group_id = p_group_id
    AND gi.created_at >= start_date
    AND (p_game_type IS NULL OR gi.game_type = p_game_type)
    GROUP BY gus.user_id, p.username
  ),
  ranked AS (
    SELECT
      user_id,
      username,
      total_score,
      ROW_NUMBER() OVER (ORDER BY total_score DESC) as rank
    FROM scored_games
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', user_id,
      'username', username,
      'score', total_score,
      'rank', rank
    ) ORDER BY rank
  ) INTO rankings
  FROM ranked;

  -- Upsert leaderboard
  INSERT INTO game_leaderboards (group_id, game_type, timeframe, rankings)
  VALUES (p_group_id, p_game_type, p_timeframe, COALESCE(rankings, '[]'::jsonb))
  ON CONFLICT (group_id, game_type, timeframe)
  DO UPDATE SET rankings = COALESCE(rankings, '[]'::jsonb), updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTIONS FOR PHASE MANAGEMENT
-- ==========================================

-- Advance game to next phase
CREATE OR REPLACE FUNCTION advance_game_phase(
  p_game_instance_id UUID,
  p_next_phase TEXT
)
RETURNS void AS $$
DECLARE
  current_phase TEXT;
BEGIN
  -- Get current phase
  SELECT game_instances.current_phase INTO current_phase
  FROM game_instances
  WHERE id = p_game_instance_id;

  -- End current phase in history
  UPDATE game_phase_history
  SET ended_at = NOW()
  WHERE game_instance_id = p_game_instance_id
  AND phase = current_phase
  AND ended_at IS NULL;

  -- Start new phase
  INSERT INTO game_phase_history (game_instance_id, phase, started_at)
  VALUES (p_game_instance_id, p_next_phase, NOW());

  -- Update game instance
  UPDATE game_instances
  SET current_phase = p_next_phase
  WHERE id = p_game_instance_id;
END;
$$ LANGUAGE plpgsql;

-- Check if all group members have responded
CREATE OR REPLACE FUNCTION all_members_responded(p_game_instance_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  member_count INTEGER;
  response_count INTEGER;
BEGIN
  -- Count group members
  SELECT COUNT(*)
  INTO member_count
  FROM group_members gm
  JOIN game_instances gi ON gi.group_id = gm.group_id
  WHERE gi.id = p_game_instance_id;

  -- Count responses
  SELECT COUNT(*)
  INTO response_count
  FROM game_responses
  WHERE game_instance_id = p_game_instance_id;

  RETURN response_count >= member_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON TABLE game_analytics IS 'Computed analytics for games (distribution curves, outliers, etc.)';
COMMENT ON TABLE debate_matches IS 'Paired debates for Hot Takes game';
COMMENT ON TABLE game_user_scores IS 'Points earned by users in each game';
COMMENT ON TABLE game_leaderboards IS 'Rankings for groups by game type and timeframe';
COMMENT ON TABLE game_phase_history IS 'History of phase transitions for multi-phase games';

COMMENT ON FUNCTION calculate_intensity_distribution(UUID) IS 'Calculates distribution stats for Would You Rather intensity scores';
COMMENT ON FUNCTION award_game_points(UUID, UUID, INTEGER, TEXT) IS 'Awards points to a user for game participation or achievement';
COMMENT ON FUNCTION calculate_leaderboard(UUID, TEXT, TEXT) IS 'Calculates and updates leaderboard for a group';
COMMENT ON FUNCTION advance_game_phase(UUID, TEXT) IS 'Advances a game to the next phase';
COMMENT ON FUNCTION all_members_responded(UUID) IS 'Checks if all group members have responded to a game';
