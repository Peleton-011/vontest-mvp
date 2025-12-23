-- ==========================================
-- Migration: Improve daily game creation logic
-- ==========================================

-- Update create_daily_games to respect timezone and notification_time
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
  v_skipped_count INTEGER := 0;
BEGIN
  -- Loop through all groups that have enabled games
  FOR v_group IN
    SELECT id, name, settings
    FROM groups
    WHERE (settings->>'enabled_games')::jsonb IS NOT NULL
      AND jsonb_array_length((settings->>'enabled_games')::jsonb) > 0
  LOOP
    -- Check if it's time to create a game for this group
    IF should_create_game_for_group(v_group.id) THEN
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
    ELSE
      -- Skip this group (not time yet, or already has a game today)
      v_skipped_count := v_skipped_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'created_games', v_success_count,
    'errors', v_error_count,
    'skipped', v_skipped_count,
    'details', v_results,
    'timestamp', NOW()
  );
END;
$$;

-- Helper function to check if a group already has an active game
CREATE OR REPLACE FUNCTION has_active_game(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM game_instances
    WHERE group_id = p_group_id
      AND status = 'active'
  );
END;
$$;

COMMENT ON FUNCTION create_daily_games IS 'Creates games for eligible groups based on timezone and notification time';
COMMENT ON FUNCTION has_active_game IS 'Checks if a group has any active games';
