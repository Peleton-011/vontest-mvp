-- ==========================================
-- Migration: Testing helpers for game creation
-- ==========================================

-- Function to reset today's games for a group (for testing)
CREATE OR REPLACE FUNCTION reset_todays_games(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete all games created today for this group
  DELETE FROM game_instances
  WHERE group_id = p_group_id
    AND created_at::DATE = CURRENT_DATE
  RETURNING COUNT(*) INTO v_deleted_count;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_games', v_deleted_count,
    'group_id', p_group_id
  );
END;
$$;

-- Function to force create a game (bypasses all checks)
CREATE OR REPLACE FUNCTION force_create_game(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Just call create_scheduled_game directly
  -- This will still check for active games, but not the time/date checks
  RETURN create_scheduled_game(p_group_id);
END;
$$;

-- Function to delete all active games for a group
CREATE OR REPLACE FUNCTION clear_active_games(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete all active games for this group
  WITH deleted AS (
    DELETE FROM game_instances
    WHERE group_id = p_group_id
      AND status = 'active'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_games', v_deleted_count,
    'group_id', p_group_id
  );
END;
$$;

-- Function to get game creation status for debugging
CREATE OR REPLACE FUNCTION debug_game_creation(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_settings JSONB;
  v_timezone TEXT;
  v_notification_time TIME;
  v_current_time_in_tz TIMESTAMPTZ;
  v_current_time_only TIME;
  v_has_game_today BOOLEAN;
  v_has_active_game BOOLEAN;
  v_within_window BOOLEAN;
  v_ready BOOLEAN;
BEGIN
  -- Get group settings
  SELECT settings INTO v_settings
  FROM groups
  WHERE id = p_group_id;

  v_timezone := COALESCE(v_settings->>'timezone', 'UTC');
  v_notification_time := (v_settings->>'notification_time')::TIME;
  v_current_time_in_tz := NOW() AT TIME ZONE v_timezone;
  v_current_time_only := v_current_time_in_tz::TIME;

  -- Check if we already created a game today
  v_has_game_today := EXISTS (
    SELECT 1 FROM game_instances
    WHERE group_id = p_group_id
      AND created_at > (NOW() AT TIME ZONE v_timezone)::DATE
  );

  -- Check if there's an active game
  v_has_active_game := has_active_game(p_group_id);

  -- Check if we're within the time window
  v_within_window := (
    v_current_time_only >= v_notification_time
    AND v_current_time_only <= v_notification_time + INTERVAL '1 hour'
  );

  -- Overall ready status
  v_ready := should_create_game_for_group(p_group_id);

  RETURN jsonb_build_object(
    'group_id', p_group_id,
    'timezone', v_timezone,
    'notification_time', v_notification_time,
    'current_time_in_tz', v_current_time_in_tz,
    'current_time_only', v_current_time_only,
    'has_game_today', v_has_game_today,
    'has_active_game', v_has_active_game,
    'within_time_window', v_within_window,
    'time_until_window', CASE
      WHEN v_current_time_only < v_notification_time THEN
        v_notification_time - v_current_time_only
      ELSE
        NULL
    END,
    'ready_for_game', v_ready,
    'blocking_reason', CASE
      WHEN v_has_game_today THEN 'Already created game today'
      WHEN v_has_active_game THEN 'Already has active game'
      WHEN NOT v_within_window THEN 'Outside time window (need to be within 1 hour of notification time)'
      ELSE NULL
    END
  );
END;
$$;

COMMENT ON FUNCTION reset_todays_games IS 'Delete all games created today for a group (for testing)';
COMMENT ON FUNCTION force_create_game IS 'Force create a game without time/date checks (for testing)';
COMMENT ON FUNCTION clear_active_games IS 'Delete all active games for a group (for testing)';
COMMENT ON FUNCTION debug_game_creation IS 'Debug why a game is not being created for a group';
