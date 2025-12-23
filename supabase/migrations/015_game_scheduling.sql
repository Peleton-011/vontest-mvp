-- ==========================================
-- Migration: Game Scheduling System
-- ==========================================

-- Table to store pre-written game prompts
CREATE TABLE IF NOT EXISTS game_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type TEXT NOT NULL CHECK (game_type IN (
    'would_you_rather',
    'hot_takes',
    'guess_who_said_it',
    'most_likely_to'
  )),
  prompt_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}', -- For categorizing prompts (e.g., 'funny', 'deep', 'controversial')
  usage_count INTEGER DEFAULT 0 -- Track how many times this prompt has been used
);

-- Index for faster prompt selection
CREATE INDEX IF NOT EXISTS idx_game_prompts_type_active
  ON game_prompts(game_type, is_active);

-- Seed some Would You Rather prompts
INSERT INTO game_prompts (game_type, prompt_data, tags) VALUES
  ('would_you_rather', '{"option_a": "Have the ability to fly", "option_b": "Have the ability to become invisible", "option_a_visual": {"type": "emoji", "value": "🦅"}, "option_b_visual": {"type": "emoji", "value": "👻"}}', ARRAY['superpowers', 'fun']),
  ('would_you_rather', '{"option_a": "Always have to tell the truth", "option_b": "Always have to lie", "option_a_visual": {"type": "emoji", "value": "😇"}, "option_b_visual": {"type": "emoji", "value": "🤥"}}', ARRAY['ethics', 'deep']),
  ('would_you_rather', '{"option_a": "Live without internet for a year", "option_b": "Live without your phone for a year", "option_a_visual": {"type": "emoji", "value": "🌐"}, "option_b_visual": {"type": "emoji", "value": "📱"}}', ARRAY['technology', 'lifestyle']),
  ('would_you_rather', '{"option_a": "Be able to speak all languages", "option_b": "Be able to talk to animals", "option_a_visual": {"type": "emoji", "value": "🗣️"}, "option_b_visual": {"type": "emoji", "value": "🐾"}}', ARRAY['superpowers', 'communication']),
  ('would_you_rather', '{"option_a": "Always be 10 minutes late", "option_b": "Always be 20 minutes early", "option_a_visual": {"type": "emoji", "value": "⏰"}, "option_b_visual": {"type": "emoji", "value": "⏱️"}}', ARRAY['lifestyle', 'funny']),
  ('would_you_rather', '{"option_a": "Have unlimited free time", "option_b": "Have unlimited money", "option_a_visual": {"type": "emoji", "value": "🏖️"}, "option_b_visual": {"type": "emoji", "value": "💰"}}', ARRAY['deep', 'lifestyle']),
  ('would_you_rather', '{"option_a": "Know how you die", "option_b": "Know when you die", "option_a_visual": {"type": "emoji", "value": "🔮"}, "option_b_visual": {"type": "emoji", "value": "📅"}}', ARRAY['deep', 'philosophical']),
  ('would_you_rather', '{"option_a": "Be famous but poor", "option_b": "Be rich but unknown", "option_a_visual": {"type": "emoji", "value": "⭐"}, "option_b_visual": {"type": "emoji", "value": "💵"}}', ARRAY['lifestyle', 'values']),
  ('would_you_rather', '{"option_a": "Relive the same day for a year", "option_b": "Skip a year of your life", "option_a_visual": {"type": "emoji", "value": "🔁"}, "option_b_visual": {"type": "emoji", "value": "⏩"}}', ARRAY['time', 'philosophical']),
  ('would_you_rather', '{"option_a": "Have a rewind button for your life", "option_b": "Have a pause button for your life", "option_a_visual": {"type": "emoji", "value": "⏮️"}, "option_b_visual": {"type": "emoji", "value": "⏸️"}}', ARRAY['superpowers', 'time'])
ON CONFLICT DO NOTHING;

-- Function to create a scheduled game for a group
CREATE OR REPLACE FUNCTION create_scheduled_game(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_settings JSONB;
  v_enabled_games TEXT[];
  v_selected_game TEXT;
  v_prompt_data JSONB;
  v_prompt_id UUID;
  v_game_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get group settings
  SELECT settings INTO v_group_settings
  FROM groups
  WHERE id = p_group_id;

  IF v_group_settings IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Group not found'
    );
  END IF;

  -- Extract enabled games
  v_enabled_games := ARRAY(
    SELECT jsonb_array_elements_text(v_group_settings->'enabled_games')
  );

  IF array_length(v_enabled_games, 1) IS NULL OR array_length(v_enabled_games, 1) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No games enabled for this group'
    );
  END IF;

  -- Randomly select a game type from enabled games
  v_selected_game := v_enabled_games[floor(random() * array_length(v_enabled_games, 1) + 1)];

  -- Check if there's already an active game of this type for this group
  IF EXISTS (
    SELECT 1 FROM game_instances
    WHERE group_id = p_group_id
      AND game_type = v_selected_game
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Active game already exists for this type',
      'game_type', v_selected_game
    );
  END IF;

  -- Select a random prompt for this game type
  -- Prefer prompts that haven't been used recently
  SELECT id, prompt_data INTO v_prompt_id, v_prompt_data
  FROM game_prompts
  WHERE game_type = v_selected_game
    AND is_active = true
  ORDER BY usage_count ASC, random()
  LIMIT 1;

  IF v_prompt_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No prompts available for selected game type',
      'game_type', v_selected_game
    );
  END IF;

  -- Set expiration (24 hours from now)
  v_expires_at := NOW() + INTERVAL '24 hours';

  -- Create the game instance
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
    v_selected_game,
    v_prompt_data,
    v_expires_at,
    'active',
    CASE
      WHEN v_selected_game = 'would_you_rather' THEN 'voting'
      WHEN v_selected_game = 'hot_takes' THEN 'submission'
      ELSE 'active'
    END,
    '{}'::jsonb
  )
  RETURNING id INTO v_game_id;

  -- Update prompt usage count
  UPDATE game_prompts
  SET usage_count = usage_count + 1
  WHERE id = v_prompt_id;

  -- Create announcement in group chat
  -- Get or create thread
  DECLARE
    v_thread_id UUID;
    v_system_user_id UUID;
  BEGIN
    -- Try to get existing thread
    SELECT id INTO v_thread_id
    FROM threads
    WHERE reference_id = p_group_id
      AND type = 'game_general'
    LIMIT 1;

    -- Create thread if it doesn't exist
    IF v_thread_id IS NULL THEN
      INSERT INTO threads (reference_id, type)
      VALUES (p_group_id, 'game_general')
      RETURNING id INTO v_thread_id;
    END IF;

    -- Use first admin as poster (or could create a system user)
    SELECT user_id INTO v_system_user_id
    FROM group_members
    WHERE group_id = p_group_id
      AND role = 'admin'
    ORDER BY joined_at ASC
    LIMIT 1;

    -- Post announcement
    IF v_system_user_id IS NOT NULL THEN
      INSERT INTO comments (thread_id, user_id, comment)
      VALUES (
        v_thread_id,
        v_system_user_id,
        '<div class="game-announcement" style="font-style: italic; padding: 0.75em; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 0.5em; color: white; text-align: center;">🎲 <strong>New Daily Game!</strong><br/>' ||
        CASE v_selected_game
          WHEN 'would_you_rather' THEN 'Would You Rather'
          WHEN 'hot_takes' THEN 'Hot Takes'
          WHEN 'guess_who_said_it' THEN 'Guess Who Said It'
          WHEN 'most_likely_to' THEN 'Most Likely To'
        END ||
        ' is now live! Check the Games tab to play.</div>'
      );
    END IF;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'game_id', v_game_id,
    'game_type', v_selected_game,
    'expires_at', v_expires_at
  );
END;
$$;

-- Function to create games for all groups that need them
CREATE OR REPLACE FUNCTION create_daily_games()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group RECORD;
  v_result JSONB;
  v_results JSONB := '[]'::jsonb;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
BEGIN
  -- Loop through all groups
  FOR v_group IN
    SELECT id, name, settings
    FROM groups
    WHERE (settings->>'enabled_games')::jsonb IS NOT NULL
  LOOP
    -- Create game for this group
    v_result := create_scheduled_game(v_group.id);

    -- Track results
    IF (v_result->>'success')::boolean THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_error_count := v_error_count + 1;
    END IF;

    -- Add to results array
    v_results := v_results || jsonb_build_object(
      'group_id', v_group.id,
      'group_name', v_group.name,
      'result', v_result
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'created_games', v_success_count,
    'errors', v_error_count,
    'details', v_results
  );
END;
$$;

-- Function to check if it's time to create games for a group
-- This considers the group's timezone and notification_time settings
CREATE OR REPLACE FUNCTION should_create_game_for_group(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_settings JSONB;
  v_timezone TEXT;
  v_notification_time TIME;
  v_current_time_in_tz TIME;
  v_last_game_created TIMESTAMPTZ;
BEGIN
  -- Get group settings
  SELECT settings INTO v_settings
  FROM groups
  WHERE id = p_group_id;

  IF v_settings IS NULL THEN
    RETURN false;
  END IF;

  -- Extract timezone and notification time
  v_timezone := COALESCE(v_settings->>'timezone', 'UTC');
  v_notification_time := (v_settings->>'notification_time')::TIME;

  -- Get current time in group's timezone
  v_current_time_in_tz := (NOW() AT TIME ZONE v_timezone)::TIME;

  -- Check if we're within 1 hour of notification time
  IF v_current_time_in_tz < v_notification_time
     OR v_current_time_in_tz > v_notification_time + INTERVAL '1 hour' THEN
    RETURN false;
  END IF;

  -- Check if we already created a game today
  SELECT MAX(created_at) INTO v_last_game_created
  FROM game_instances
  WHERE group_id = p_group_id
    AND created_at > (NOW() AT TIME ZONE v_timezone)::DATE;

  IF v_last_game_created IS NOT NULL THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON TABLE game_prompts IS 'Pre-written prompts for automated game creation';
COMMENT ON FUNCTION create_scheduled_game IS 'Creates a new game instance for a group using a random prompt';
COMMENT ON FUNCTION create_daily_games IS 'Creates games for all groups (called by scheduler)';
COMMENT ON FUNCTION should_create_game_for_group IS 'Checks if a group is ready for a new game based on timezone and notification time';
