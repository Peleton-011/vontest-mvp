-- Fix game phase assignment in create_scheduled_game function
-- Guess Who Said It should start in 'submission' phase
-- Most Likely To should start in 'voting' phase

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

  -- If no games enabled, default to all games
  IF v_enabled_games IS NULL OR array_length(v_enabled_games, 1) IS NULL THEN
    v_enabled_games := ARRAY['would_you_rather', 'hot_takes', 'guess_who_said_it', 'most_likely_to'];
  END IF;

  -- Check if there's already an active game
  IF EXISTS (
    SELECT 1 FROM game_instances
    WHERE group_id = p_group_id
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Group already has an active game'
    );
  END IF;

  -- Randomly select a game type from enabled games
  v_selected_game := v_enabled_games[floor(random() * array_length(v_enabled_games, 1) + 1)];

  -- Get a random unused or least-used prompt for this game type
  SELECT id, prompt_data INTO v_prompt_id, v_prompt_data
  FROM game_prompts
  WHERE game_type = v_selected_game
    AND is_active = true
  ORDER BY usage_count ASC, random()
  LIMIT 1;

  IF v_prompt_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No prompts available for game type: ' || v_selected_game
    );
  END IF;

  -- Calculate expiration (24 hours from now)
  v_expires_at := NOW() + INTERVAL '24 hours';

  -- Create the game instance with proper phase assignment
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
      WHEN v_selected_game = 'guess_who_said_it' THEN 'submission'
      WHEN v_selected_game = 'most_likely_to' THEN 'voting'
      ELSE 'active'
    END,
    '{}'::jsonb
  )
  RETURNING id INTO v_game_id;

  -- Update prompt usage count
  UPDATE game_prompts
  SET usage_count = usage_count + 1
  WHERE id = v_prompt_id;

  -- Create announcement in group chat as SYSTEM
  DECLARE
    v_thread_id UUID;
  BEGIN
    -- Try to get existing thread
    SELECT id INTO v_thread_id
    FROM threads
    WHERE associated_group_id = p_group_id
    LIMIT 1;

    -- If thread doesn't exist, create it
    IF v_thread_id IS NULL THEN
      INSERT INTO threads (associated_group_id, title, metadata)
      VALUES (p_group_id, 'Group Chat', '{}')
      RETURNING id INTO v_thread_id;
    END IF;

    -- Post announcement as SYSTEM user
    INSERT INTO messages (
      thread_id,
      user_id,
      content,
      metadata
    ) VALUES (
      v_thread_id,
      (SELECT id FROM profiles WHERE username = 'system' LIMIT 1),
      '<div class="game-announcement" style="font-style: italic; padding: 0.75em; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 0.5em; color: white; text-align: center;">🎲 <strong>New Daily Game!</strong><br/>' ||
      CASE v_selected_game
        WHEN 'would_you_rather' THEN 'Would You Rather'
        WHEN 'hot_takes' THEN 'Hot Takes'
        WHEN 'guess_who_said_it' THEN 'Guess Who Said It'
        WHEN 'most_likely_to' THEN 'Most Likely To'
      END ||
      ' is ready to play!</div>',
      jsonb_build_object(
        'game_id', v_game_id,
        'game_type', v_selected_game,
        'type', 'game_announcement'
      )
    );
  END;

  RETURN jsonb_build_object(
    'success', true,
    'game_id', v_game_id,
    'game_type', v_selected_game,
    'expires_at', v_expires_at
  );
END;
$$;
