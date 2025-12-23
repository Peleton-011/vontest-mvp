-- ==========================================
-- Migration: Fix reset_todays_games function
-- ==========================================

-- Drop and recreate with correct syntax (RETURNING doesn't support COUNT)
DROP FUNCTION IF EXISTS reset_todays_games(UUID);

CREATE FUNCTION reset_todays_games(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete all games created today for this group
  WITH deleted AS (
    DELETE FROM game_instances
    WHERE group_id = p_group_id
      AND created_at::DATE = CURRENT_DATE
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

COMMENT ON FUNCTION reset_todays_games IS 'Delete all games created today for a group (for testing)';
