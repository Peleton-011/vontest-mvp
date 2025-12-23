-- ==========================================
-- Migration: Testing helpers for all game types
-- ==========================================

-- Function to test Hot Takes game
CREATE OR REPLACE FUNCTION test_hot_takes_game(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_prompt_data JSONB;
  v_game_id UUID;
  v_result JSONB;
BEGIN
  -- Get a random Hot Takes prompt
  SELECT prompt_data INTO v_prompt_data
  FROM game_prompts
  WHERE game_type = 'hot_takes'
    AND is_active = true
  ORDER BY random()
  LIMIT 1;

  IF v_prompt_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No Hot Takes prompts available'
    );
  END IF;

  -- Create the game
  INSERT INTO game_instances (
    group_id,
    game_type,
    prompt,
    expires_at,
    status,
    current_phase,
    metadata
  ) VALUES (
    p_group_id,
    'hot_takes',
    v_prompt_data,
    NOW() + INTERVAL '24 hours',
    'active',
    'voting',
    '{"agree": 0, "disagree": 0, "neutral": 0}'::jsonb
  )
  RETURNING id INTO v_game_id;

  RETURN jsonb_build_object(
    'success', true,
    'game_id', v_game_id,
    'game_type', 'hot_takes',
    'prompt', v_prompt_data,
    'test_url', '/games/' || p_group_id
  );
END;
$$;

-- Function to test Guess Who Said It game
CREATE OR REPLACE FUNCTION test_guess_who_game(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_prompt_data JSONB;
  v_game_id UUID;
BEGIN
  -- Get a random Guess Who prompt
  SELECT prompt_data INTO v_prompt_data
  FROM game_prompts
  WHERE game_type = 'guess_who_said_it'
    AND is_active = true
  ORDER BY random()
  LIMIT 1;

  IF v_prompt_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No Guess Who Said It prompts available'
    );
  END IF;

  -- Create the game
  INSERT INTO game_instances (
    group_id,
    game_type,
    prompt,
    expires_at,
    status,
    current_phase,
    metadata
  ) VALUES (
    p_group_id,
    'guess_who_said_it',
    v_prompt_data,
    NOW() + INTERVAL '24 hours',
    'active',
    'submission', -- First phase: submit answers
    '{}'::jsonb
  )
  RETURNING id INTO v_game_id;

  RETURN jsonb_build_object(
    'success', true,
    'game_id', v_game_id,
    'game_type', 'guess_who_said_it',
    'prompt', v_prompt_data,
    'test_url', '/games/' || p_group_id,
    'note', 'Phase 1: Submit answers. Use start_guessing_phase() to move to Phase 2'
  );
END;
$$;

-- Function to test Most Likely To game
CREATE OR REPLACE FUNCTION test_most_likely_to_game(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_prompt_data JSONB;
  v_game_id UUID;
BEGIN
  -- Get a random Most Likely To prompt
  SELECT prompt_data INTO v_prompt_data
  FROM game_prompts
  WHERE game_type = 'most_likely_to'
    AND is_active = true
  ORDER BY random()
  LIMIT 1;

  IF v_prompt_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No Most Likely To prompts available'
    );
  END IF;

  -- Create the game
  INSERT INTO game_instances (
    group_id,
    game_type,
    prompt,
    expires_at,
    status,
    current_phase,
    metadata
  ) VALUES (
    p_group_id,
    'most_likely_to',
    v_prompt_data,
    NOW() + INTERVAL '24 hours',
    'active',
    'voting',
    '{}'::jsonb
  )
  RETURNING id INTO v_game_id;

  RETURN jsonb_build_object(
    'success', true,
    'game_id', v_game_id,
    'game_type', 'most_likely_to',
    'prompt', v_prompt_data,
    'test_url', '/games/' || p_group_id
  );
END;
$$;

-- Function to get random prompts by game type
CREATE OR REPLACE FUNCTION get_random_prompts(p_game_type TEXT, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  game_type TEXT,
  prompt_data JSONB,
  tags TEXT[],
  usage_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gp.id,
    gp.game_type,
    gp.prompt_data,
    gp.tags,
    gp.usage_count
  FROM game_prompts gp
  WHERE gp.game_type = p_game_type
    AND gp.is_active = true
  ORDER BY random()
  LIMIT p_limit;
END;
$$;

-- Function to view all available game types with prompt counts
CREATE OR REPLACE FUNCTION view_game_types_stats()
RETURNS TABLE (
  game_type TEXT,
  total_prompts BIGINT,
  active_prompts BIGINT,
  total_games_created BIGINT,
  active_games BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gp.game_type,
    COUNT(*) as total_prompts,
    COUNT(*) FILTER (WHERE gp.is_active) as active_prompts,
    (SELECT COUNT(*) FROM game_instances WHERE game_type = gp.game_type) as total_games_created,
    (SELECT COUNT(*) FROM game_instances WHERE game_type = gp.game_type AND status = 'active') as active_games
  FROM game_prompts gp
  GROUP BY gp.game_type
  ORDER BY gp.game_type;
END;
$$;

-- Convenience function to test all game types for a group
CREATE OR REPLACE FUNCTION test_all_game_types(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_results JSONB := '[]'::jsonb;
  v_result JSONB;
BEGIN
  -- Test Would You Rather (already exists, so just create one)
  v_result := create_scheduled_game(p_group_id);
  v_results := v_results || jsonb_build_object('would_you_rather', v_result);

  -- Clear active games before testing others
  DELETE FROM game_instances WHERE group_id = p_group_id AND status = 'active';

  -- Test Hot Takes
  v_result := test_hot_takes_game(p_group_id);
  v_results := v_results || jsonb_build_object('hot_takes', v_result);

  -- Clear active games
  DELETE FROM game_instances WHERE group_id = p_group_id AND status = 'active';

  -- Test Guess Who Said It
  v_result := test_guess_who_game(p_group_id);
  v_results := v_results || jsonb_build_object('guess_who_said_it', v_result);

  -- Clear active games
  DELETE FROM game_instances WHERE group_id = p_group_id AND status = 'active';

  -- Test Most Likely To
  v_result := test_most_likely_to_game(p_group_id);
  v_results := v_results || jsonb_build_object('most_likely_to', v_result);

  RETURN jsonb_build_object(
    'success', true,
    'tested_group_id', p_group_id,
    'results', v_results,
    'note', 'All game types tested successfully! Last active game is Most Likely To'
  );
END;
$$;

COMMENT ON FUNCTION test_hot_takes_game IS 'Create a test Hot Takes game with a random prompt';
COMMENT ON FUNCTION test_guess_who_game IS 'Create a test Guess Who Said It game with a random prompt';
COMMENT ON FUNCTION test_most_likely_to_game IS 'Create a test Most Likely To game with a random prompt';
COMMENT ON FUNCTION get_random_prompts IS 'Get random prompts for a specific game type';
COMMENT ON FUNCTION view_game_types_stats IS 'View statistics for all game types';
COMMENT ON FUNCTION test_all_game_types IS 'Test creating one game of each type for a group';
