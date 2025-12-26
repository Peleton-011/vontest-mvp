-- ==========================================
-- MIGRATION 002: Game Instances Core
-- ==========================================
-- Description: Creates game instance tables for daily games
-- Run this after 001_groups_and_members.sql

-- ==========================================
-- TABLES
-- ==========================================

-- Game instances table
CREATE TABLE IF NOT EXISTS game_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN (
    'would_you_rather',
    'hot_takes',
    'guess_who_said_it',
    'most_likely_to',
    'predict_your_friends',
    'dinner_party_dilemmas',
    'two_truths_roulette',
    'bracket_battle_royale',
    'compliment_economy'
  )),
  prompt JSONB NOT NULL, -- Game-specific prompt data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'expired')) DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb, -- For storing results, stats, etc.
  current_phase TEXT DEFAULT 'submission', -- For multi-phase games
  phase_deadline TIMESTAMPTZ -- When current phase ends
);

-- Game responses table (user submissions)
CREATE TABLE IF NOT EXISTS game_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  response_data JSONB NOT NULL, -- Flexible structure per game type
  intensity_score INTEGER CHECK (intensity_score BETWEEN 1 AND 10), -- For Would You Rather
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_instance_id, user_id) -- One response per user per game
);

-- Game votes table (voting on options or other users)
CREATE TABLE IF NOT EXISTS game_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  voted_for_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- For "most likely to" style games
  voted_option TEXT, -- For "would you rather", "hot takes" style games
  voted_for_response_id UUID REFERENCES game_responses(id) ON DELETE CASCADE, -- For voting on submissions
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure one vote per voter per game
  UNIQUE(game_instance_id, voter_id)
);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_game_instances_group_status ON game_instances(group_id, status);
CREATE INDEX IF NOT EXISTS idx_game_instances_expires ON game_instances(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_game_instances_type ON game_instances(game_type);
CREATE INDEX IF NOT EXISTS idx_game_responses_instance ON game_responses(game_instance_id);
CREATE INDEX IF NOT EXISTS idx_game_responses_user ON game_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_game_votes_instance ON game_votes(game_instance_id);
CREATE INDEX IF NOT EXISTS idx_game_votes_voter ON game_votes(voter_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE game_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_votes ENABLE ROW LEVEL SECURITY;

-- Game instances: Members can view group games
CREATE POLICY "Members can view group games"
  ON game_instances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = game_instances.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Game instances: System can create (will be done via Edge Functions)
-- Admins can also manually create
CREATE POLICY "Admins can create games"
  ON game_instances FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = game_instances.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Game instances: Admins can update
CREATE POLICY "Admins can update games"
  ON game_instances FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = game_instances.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Game responses: Members can create responses
CREATE POLICY "Members can create responses"
  ON game_responses FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM game_instances gi
      JOIN group_members gm ON gm.group_id = gi.group_id
      WHERE gi.id = game_instance_id
      AND gm.user_id = auth.uid()
      AND gi.status = 'active'
    )
  );

-- Game responses: Members can view group game responses
CREATE POLICY "Members can view group game responses"
  ON game_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_instances gi
      JOIN group_members gm ON gm.group_id = gi.group_id
      WHERE gi.id = game_instance_id
      AND gm.user_id = auth.uid()
    )
  );

-- Game responses: Users can update their own responses
CREATE POLICY "Users can update own responses"
  ON game_responses FOR UPDATE
  USING (user_id = auth.uid());

-- Game votes: Members can vote
CREATE POLICY "Members can vote"
  ON game_votes FOR INSERT
  WITH CHECK (
    auth.uid() = voter_id AND
    EXISTS (
      SELECT 1 FROM game_instances gi
      JOIN group_members gm ON gm.group_id = gi.group_id
      WHERE gi.id = game_instance_id
      AND gm.user_id = auth.uid()
      AND gi.status = 'active'
    )
  );

-- Game votes: Members can view votes
CREATE POLICY "Members can view votes"
  ON game_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_instances gi
      JOIN group_members gm ON gm.group_id = gi.group_id
      WHERE gi.id = game_instance_id
      AND gm.user_id = auth.uid()
    )
  );

-- Game votes: Users can update their own votes (if game allows revoting)
CREATE POLICY "Users can update own votes"
  ON game_votes FOR UPDATE
  USING (voter_id = auth.uid());

-- ==========================================
-- FUNCTIONS
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for game_responses
CREATE TRIGGER update_game_responses_updated_at
  BEFORE UPDATE ON game_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to expire old games
CREATE OR REPLACE FUNCTION expire_old_games()
RETURNS void AS $$
BEGIN
  UPDATE game_instances
  SET status = 'expired'
  WHERE status = 'active'
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get active game for a group
CREATE OR REPLACE FUNCTION get_active_game(p_group_id UUID)
RETURNS SETOF game_instances AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM game_instances
  WHERE group_id = p_group_id
  AND status = 'active'
  AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON TABLE game_instances IS 'Daily game instances for each group';
COMMENT ON TABLE game_responses IS 'User responses/submissions for games';
COMMENT ON TABLE game_votes IS 'User votes on game options, other users, or submissions';
COMMENT ON COLUMN game_responses.intensity_score IS 'Intensity rating 1-10 for Would You Rather game';
COMMENT ON COLUMN game_instances.current_phase IS 'Current phase for multi-phase games (submission, guessing, reveal)';
COMMENT ON FUNCTION expire_old_games() IS 'Marks games as expired when they pass expiration time';
COMMENT ON FUNCTION get_active_game(UUID) IS 'Gets the current active game for a group';
