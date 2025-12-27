-- ==========================================
-- Migration: Fix Game Creation Trigger
-- ==========================================
-- Fixes intermittent errors when creating games by making
-- the thread creation trigger more robust

-- Update the trigger function to handle errors gracefully
CREATE OR REPLACE FUNCTION create_thread_for_new_game()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_id UUID;
BEGIN
  -- Create thread for this game instance
  -- Wrap in exception handler to prevent game creation from failing
  BEGIN
    INSERT INTO threads (reference_id, type)
    VALUES (NEW.id, 'game_instance')
    RETURNING id INTO v_thread_id;

    RAISE NOTICE 'Created thread % for game %', v_thread_id, NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the game creation
      RAISE WARNING 'Failed to create thread for game %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION create_thread_for_new_game IS 'Automatically creates a discussion thread when a game instance is created (with error handling)';

-- Also update create_game_thread to be more defensive
CREATE OR REPLACE FUNCTION create_game_thread(p_game_instance_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_id UUID;
BEGIN
  -- Check if thread already exists
  SELECT id INTO v_thread_id
  FROM threads
  WHERE reference_id = p_game_instance_id
    AND type = 'game_instance'
  LIMIT 1;

  -- Only create if it doesn't exist
  IF v_thread_id IS NULL THEN
    INSERT INTO threads (reference_id, type)
    VALUES (p_game_instance_id, 'game_instance')
    RETURNING id INTO v_thread_id;
  END IF;

  RETURN v_thread_id;
END;
$$;

COMMENT ON FUNCTION create_game_thread IS 'Creates or returns existing discussion thread for a game instance';
