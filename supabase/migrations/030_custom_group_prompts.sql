-- ==========================================
-- Migration: Custom Group Prompts
-- ==========================================
-- Allows group admins to create custom prompts for their group
-- Rate limited to 10 prompts per week per group

-- ==========================================
-- 1. MODIFY GAME_PROMPTS TABLE
-- ==========================================

-- Add columns for custom group prompts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_prompts' AND column_name = 'created_by_group_id'
  ) THEN
    ALTER TABLE game_prompts
      ADD COLUMN created_by_group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_prompts' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE game_prompts
      ADD COLUMN created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for custom prompts queries
CREATE INDEX IF NOT EXISTS idx_game_prompts_custom
  ON game_prompts(created_by_group_id, game_type, is_active);

COMMENT ON COLUMN game_prompts.created_by_group_id IS 'If set, this is a custom prompt created by this group (only visible to them)';
COMMENT ON COLUMN game_prompts.created_by_user_id IS 'User who created this custom prompt';

-- ==========================================
-- 2. RATE LIMITING FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION check_custom_prompt_limit(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count prompts created in last 7 days
  SELECT COUNT(*) INTO v_count
  FROM game_prompts
  WHERE created_by_group_id = p_group_id
    AND created_at > NOW() - INTERVAL '7 days';

  -- Return true if under limit (10 per week)
  RETURN v_count < 10;
END;
$$;

COMMENT ON FUNCTION check_custom_prompt_limit IS 'Check if group has reached custom prompt creation limit (10 per week)';

-- ==========================================
-- 3. CREATE CUSTOM PROMPT FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION create_custom_prompt(
  p_group_id UUID,
  p_game_type TEXT,
  p_prompt_data JSONB,
  p_tags TEXT[] DEFAULT '{}',
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prompt_id UUID;
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Get user ID
  v_user_id := COALESCE(p_created_by, auth.uid());

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Verify user is admin of the group
  SELECT (role = 'admin') INTO v_is_admin
  FROM group_members
  WHERE group_id = p_group_id
    AND user_id = v_user_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only group admins can create custom prompts'
    );
  END IF;

  -- Check rate limit
  IF NOT check_custom_prompt_limit(p_group_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rate limit exceeded: maximum 10 custom prompts per week'
    );
  END IF;

  -- Validate game type
  IF p_game_type NOT IN ('would_you_rather', 'hot_takes', 'guess_who_said_it', 'most_likely_to') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid game type'
    );
  END IF;

  -- Validate prompt data based on game type
  CASE p_game_type
    WHEN 'would_you_rather' THEN
      IF NOT (p_prompt_data ? 'option_a' AND p_prompt_data ? 'option_b') THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Would You Rather requires option_a and option_b'
        );
      END IF;

    WHEN 'hot_takes' THEN
      IF NOT (p_prompt_data ? 'statement') THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Hot Takes requires statement'
        );
      END IF;

    WHEN 'guess_who_said_it' THEN
      IF NOT (p_prompt_data ? 'question') THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Guess Who Said It requires question'
        );
      END IF;

    WHEN 'most_likely_to' THEN
      IF NOT (p_prompt_data ? 'scenario') THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Most Likely To requires scenario'
        );
      END IF;
  END CASE;

  -- Create the custom prompt
  INSERT INTO game_prompts (
    game_type,
    prompt_data,
    tags,
    created_by_group_id,
    created_by_user_id,
    is_active
  ) VALUES (
    p_game_type,
    p_prompt_data,
    COALESCE(p_tags, ARRAY['custom']::TEXT[]) || ARRAY['custom'],  -- Always include 'custom' tag
    p_group_id,
    v_user_id,
    true
  )
  RETURNING id INTO v_prompt_id;

  RETURN jsonb_build_object(
    'success', true,
    'prompt_id', v_prompt_id
  );
END;
$$;

COMMENT ON FUNCTION create_custom_prompt IS 'Create a custom prompt for a group (admin only, rate limited)';

-- ==========================================
-- 4. DELETE CUSTOM PROMPT FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION delete_custom_prompt(
  p_prompt_id UUID,
  p_group_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_deleted BOOLEAN := false;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Verify user is admin of the group
  SELECT (role = 'admin') INTO v_is_admin
  FROM group_members
  WHERE group_id = p_group_id
    AND user_id = v_user_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only group admins can delete custom prompts'
    );
  END IF;

  -- Delete the prompt (only if it belongs to this group)
  DELETE FROM game_prompts
  WHERE id = p_prompt_id
    AND created_by_group_id = p_group_id
  RETURNING true INTO v_deleted;

  IF v_deleted THEN
    RETURN jsonb_build_object(
      'success', true
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Prompt not found or does not belong to this group'
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION delete_custom_prompt IS 'Delete a custom prompt (admin only)';

-- ==========================================
-- 5. GET CUSTOM PROMPTS FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION get_custom_prompts(p_group_id UUID)
RETURNS TABLE (
  id UUID,
  game_type TEXT,
  prompt_data JSONB,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  created_by_username TEXT,
  usage_count INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gp.id,
    gp.game_type,
    gp.prompt_data,
    gp.tags,
    gp.created_at,
    COALESCE(p.username, 'Unknown') as created_by_username,
    gp.usage_count
  FROM game_prompts gp
  LEFT JOIN profiles p ON p.id = gp.created_by_user_id
  WHERE gp.created_by_group_id = p_group_id
    AND gp.is_active = true
  ORDER BY gp.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_custom_prompts IS 'Get all custom prompts for a group';

-- ==========================================
-- 6. GET CUSTOM PROMPT STATS
-- ==========================================

CREATE OR REPLACE FUNCTION get_custom_prompt_stats(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total INTEGER;
  v_this_week INTEGER;
  v_remaining INTEGER;
  v_by_game_type JSONB;
BEGIN
  -- Total custom prompts
  SELECT COUNT(*) INTO v_total
  FROM game_prompts
  WHERE created_by_group_id = p_group_id
    AND is_active = true;

  -- Prompts created this week
  SELECT COUNT(*) INTO v_this_week
  FROM game_prompts
  WHERE created_by_group_id = p_group_id
    AND created_at > NOW() - INTERVAL '7 days';

  -- Remaining this week
  v_remaining := GREATEST(0, 10 - v_this_week);

  -- Count by game type
  SELECT jsonb_object_agg(game_type, count)
  INTO v_by_game_type
  FROM (
    SELECT game_type, COUNT(*)::int as count
    FROM game_prompts
    WHERE created_by_group_id = p_group_id
      AND is_active = true
    GROUP BY game_type
  ) counts;

  RETURN jsonb_build_object(
    'total', v_total,
    'this_week', v_this_week,
    'remaining_this_week', v_remaining,
    'by_game_type', COALESCE(v_by_game_type, '{}'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION get_custom_prompt_stats IS 'Get statistics about custom prompts for a group';

-- ==========================================
-- 7. UPDATE PROMPT SELECTION (from migration 029)
-- ==========================================
-- This updates the create_scheduled_game function to include custom prompts

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
  -- ENHANCED PROMPT SELECTION
  -- Includes: base game, purchased packages, AND custom group prompts
  -- ==========================================

  SELECT id, prompt_data INTO v_prompt_id, v_prompt_data
  FROM game_prompts
  WHERE game_type = v_selected_game
    AND is_active = true
    AND (
      -- Base game prompts (free for everyone)
      (package_id IS NULL AND created_by_group_id IS NULL)
      OR
      -- Premium prompts from purchased packages
      package_id IN (
        SELECT gpp.package_id
        FROM group_prompt_packages gpp
        WHERE gpp.group_id = p_group_id
          AND gpp.is_active = true
          AND (gpp.expires_at IS NULL OR gpp.expires_at > NOW())
      )
      OR
      -- Custom prompts created by this group
      created_by_group_id = p_group_id
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

COMMENT ON FUNCTION create_scheduled_game IS 'Create a scheduled game with support for base game, packages, and custom prompts';

-- ==========================================
-- 8. RLS POLICIES
-- ==========================================

-- Groups can view their own custom prompts
DROP POLICY IF EXISTS "Groups can view own custom prompts" ON game_prompts;
CREATE POLICY "Groups can view own custom prompts"
  ON game_prompts FOR SELECT
  USING (
    is_active = true
    AND (
      -- Base game prompts
      (package_id IS NULL AND created_by_group_id IS NULL)
      OR
      -- Purchased packages
      package_id IN (
        SELECT gpp.package_id
        FROM group_prompt_packages gpp
        JOIN group_members gm ON gm.group_id = gpp.group_id
        WHERE gm.user_id = auth.uid()
          AND gpp.is_active = true
      )
      OR
      -- Custom prompts from user's groups
      created_by_group_id IN (
        SELECT group_id
        FROM group_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- ==========================================
-- NOTES
-- ==========================================
-- Custom prompts are:
-- - Only visible to the group that created them
-- - Created by group admins only
-- - Rate limited to 10 per week per group
-- - Deleted when group is deleted (CASCADE)
-- - Always tagged with 'custom'
-- - Included in prompt selection alongside base game and packages
