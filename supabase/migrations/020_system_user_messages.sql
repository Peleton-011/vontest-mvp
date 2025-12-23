-- ==========================================
-- Migration: Add system user for automated messages
-- ==========================================

-- Create a system profile for automated game announcements
-- We'll use a special UUID that's recognizable as a system user
-- Using nil UUID: 00000000-0000-0000-0000-000000000000

-- First, check if we need to make user_id nullable in comments
-- (It might already be, or we might need to use a special system user)

-- Option 1: Insert a system profile if it doesn't exist
-- This requires the auth.users table which we might not have access to

-- Option 2: Allow NULL user_id for system messages
ALTER TABLE comments
  ALTER COLUMN user_id DROP NOT NULL;

-- Add a comment type to distinguish system messages
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'user' CHECK (message_type IN ('user', 'system', 'game_announcement'));

-- Update the create_scheduled_game function to use NULL for system messages
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

  -- Create announcement in group chat as SYSTEM
  DECLARE
    v_thread_id UUID;
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

    -- Post announcement with NULL user_id (system message)
    INSERT INTO comments (thread_id, user_id, comment, message_type)
    VALUES (
      v_thread_id,
      NULL,  -- NULL means system message
      '<div class="game-announcement" style="font-style: italic; padding: 0.75em; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 0.5em; color: white; text-align: center;">🎲 <strong>New Daily Game!</strong><br/>' ||
      CASE v_selected_game
        WHEN 'would_you_rather' THEN 'Would You Rather'
        WHEN 'hot_takes' THEN 'Hot Takes'
        WHEN 'guess_who_said_it' THEN 'Guess Who Said It'
        WHEN 'most_likely_to' THEN 'Most Likely To'
      END ||
      ' is now live! Check the Games tab to play.</div>',
      'game_announcement'
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

COMMENT ON COLUMN comments.message_type IS 'Type of message: user (default), system, or game_announcement';
