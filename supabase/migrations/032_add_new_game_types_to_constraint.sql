-- Add new game types to the game_instances game_type check constraint
-- This fixes: "new row for relation "game_instances" violates check constraint "game_instances_game_type_check"

-- First, drop the existing constraint
ALTER TABLE game_instances
  DROP CONSTRAINT IF EXISTS game_instances_game_type_check;

-- Re-add the constraint with all game types including new ones
ALTER TABLE game_instances
  ADD CONSTRAINT game_instances_game_type_check
  CHECK (game_type IN (
    'would_you_rather',
    'hot_takes',
    'guess_who_said_it',
    'most_likely_to',
    'two_truths_roulette',
    'predict_your_friends',
    'dinner_party_dilemmas',
    'compliment_economy',
    'bracket_battle'
  ));

-- Also update the create_scheduled_game function to include new game types in defaults
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

  -- If no games enabled, default to core games only (those with working prompts)
  IF v_enabled_games IS NULL OR array_length(v_enabled_games, 1) IS NULL THEN
    v_enabled_games := ARRAY[
      'would_you_rather',
      'hot_takes',
      'guess_who_said_it',
      'most_likely_to'
    ];
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
      WHEN v_selected_game = 'two_truths_roulette' THEN 'submission'
      WHEN v_selected_game = 'predict_your_friends' THEN 'prediction'
      WHEN v_selected_game = 'dinner_party_dilemmas' THEN 'submission'
      WHEN v_selected_game = 'compliment_economy' THEN 'submission'
      WHEN v_selected_game = 'bracket_battle' THEN 'submission'
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
  DECLARE
    v_thread_id UUID;
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
        WHEN 'two_truths_roulette' THEN 'Two Truths Roulette'
        WHEN 'predict_your_friends' THEN 'Predict Your Friends'
        WHEN 'dinner_party_dilemmas' THEN 'Dinner Party Dilemmas'
        WHEN 'compliment_economy' THEN 'Compliment Economy'
        WHEN 'bracket_battle' THEN 'Bracket Battle'
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
