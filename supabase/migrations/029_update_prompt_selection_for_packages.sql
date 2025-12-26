-- ==========================================
-- Migration: Update Prompt Selection for Packages
-- ==========================================
-- Updates the create_scheduled_game function to respect package ownership
-- when selecting prompts for a group.

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
  v_thread_id UUID;
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

  -- ==========================================
  -- PACKAGE-AWARE PROMPT SELECTION
  -- ==========================================
  -- Select a random prompt that the group has access to:
  -- 1. Base game prompts (package_id IS NULL) - always available
  -- 2. Prompts from purchased packages
  --
  -- This query is the key change for package support!
  -- ==========================================

  SELECT id, prompt_data INTO v_prompt_id, v_prompt_data
  FROM game_prompts
  WHERE game_type = v_selected_game
    AND is_active = true
    AND (
      -- Base game prompts (always available)
      package_id IS NULL
      OR
      -- Premium prompts from purchased packages
      package_id IN (
        SELECT gpp.package_id
        FROM group_prompt_packages gpp
        WHERE gpp.group_id = p_group_id
          AND gpp.is_active = true
          AND (gpp.expires_at IS NULL OR gpp.expires_at > NOW())
      )
    )
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

  -- Create announcement in group chat
  BEGIN
    -- Try to get existing thread
    SELECT id INTO v_thread_id
    FROM threads
    WHERE reference_id = p_group_id
      AND type = 'game_general'
    LIMIT 1;

    -- If thread doesn't exist, create it
    IF v_thread_id IS NULL THEN
      INSERT INTO threads (reference_id, type)
      VALUES (p_group_id, 'game_general')
      RETURNING id INTO v_thread_id;
    END IF;

    -- Post announcement with NULL user_id (system message)
    INSERT INTO comments (
      thread_id,
      user_id,
      comment
    ) VALUES (
      v_thread_id,
      NULL,  -- System message
      '<div class="game-announcement" style="font-style: italic; padding: 0.75em; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 0.5em; color: white; text-align: center;">🎲 <strong>New Daily Game!</strong><br/>' ||
      CASE v_selected_game
        WHEN 'would_you_rather' THEN 'Would You Rather'
        WHEN 'hot_takes' THEN 'Hot Takes'
        WHEN 'guess_who_said_it' THEN 'Guess Who Said It'
        WHEN 'most_likely_to' THEN 'Most Likely To'
      END ||
      ' is ready to play!</div>'
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

COMMENT ON FUNCTION create_scheduled_game IS 'Create a scheduled game with package-aware prompt selection';

-- ==========================================
-- TESTING HELPER
-- ==========================================
-- Function to test package access for a group

CREATE OR REPLACE FUNCTION test_package_access(p_group_id UUID, p_game_type TEXT)
RETURNS TABLE (
  prompt_id UUID,
  prompt_text TEXT,
  package_name TEXT,
  is_base_game BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gp.id,
    CASE
      WHEN p_game_type = 'would_you_rather' THEN
        (gp.prompt_data->>'option_a') || ' vs ' || (gp.prompt_data->>'option_b')
      WHEN p_game_type = 'hot_takes' THEN
        gp.prompt_data->>'statement'
      WHEN p_game_type = 'guess_who_said_it' THEN
        gp.prompt_data->>'question'
      WHEN p_game_type = 'most_likely_to' THEN
        gp.prompt_data->>'scenario'
      ELSE 'Unknown'
    END AS prompt_text,
    COALESCE(pp.name, 'Base Game') AS package_name,
    (gp.package_id IS NULL) AS is_base_game
  FROM game_prompts gp
  LEFT JOIN prompt_packages pp ON pp.id = gp.package_id
  WHERE gp.game_type = p_game_type
    AND gp.is_active = true
    AND (
      gp.package_id IS NULL
      OR gp.package_id IN (
        SELECT gpp.package_id
        FROM group_prompt_packages gpp
        WHERE gpp.group_id = p_group_id
          AND gpp.is_active = true
          AND (gpp.expires_at IS NULL OR gpp.expires_at > NOW())
      )
    )
  ORDER BY is_base_game DESC, pp.name, gp.created_at;
END;
$$;

COMMENT ON FUNCTION test_package_access IS 'Test which prompts a group can access for a given game type';

-- ==========================================
-- USAGE EXAMPLE
-- ==========================================
-- To test which prompts a group can see:
-- SELECT * FROM test_package_access('your-group-id-here', 'would_you_rather');
