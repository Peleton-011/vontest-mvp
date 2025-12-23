-- Add automatic phase transitions and game completion when all users have responded

-- Function to check and auto-advance game phases or complete games
CREATE OR REPLACE FUNCTION check_and_advance_game_phase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_instance RECORD;
  v_total_members INTEGER;
  v_total_responses INTEGER;
  v_responses_with_guesses INTEGER;
BEGIN
  -- Get the game instance
  SELECT * INTO v_game_instance
  FROM game_instances
  WHERE id = NEW.game_instance_id;

  -- Only process active games
  IF v_game_instance.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Count total members in the group
  SELECT COUNT(*) INTO v_total_members
  FROM group_members
  WHERE group_id = v_game_instance.group_id;

  -- Count total responses for this game
  SELECT COUNT(DISTINCT user_id) INTO v_total_responses
  FROM game_responses
  WHERE game_instance_id = v_game_instance.id;

  -- Check if all members have responded
  IF v_total_responses >= v_total_members THEN
    -- Handle based on game type
    CASE v_game_instance.game_type
      -- Guess Who Said It: two-phase game
      WHEN 'guess_who_said_it' THEN
        IF v_game_instance.current_phase = 'submission' THEN
          -- Auto-advance to guessing phase
          UPDATE game_instances
          SET current_phase = 'guessing',
              metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{auto_advanced}',
                'true'::jsonb
              )
          WHERE id = v_game_instance.id;

          RAISE NOTICE 'Auto-advanced Guess Who Said It game % to guessing phase', v_game_instance.id;
        ELSIF v_game_instance.current_phase = 'guessing' THEN
          -- Check if all users have submitted guesses
          SELECT COUNT(*) INTO v_responses_with_guesses
          FROM game_responses
          WHERE game_instance_id = v_game_instance.id
            AND response_data ? 'guesses';

          -- If all members have guesses, complete the game
          IF v_responses_with_guesses >= v_total_members THEN
            UPDATE game_instances
            SET status = 'completed',
                metadata = jsonb_set(
                  COALESCE(metadata, '{}'::jsonb),
                  '{auto_completed}',
                  'true'::jsonb
                )
            WHERE id = v_game_instance.id;

            RAISE NOTICE 'Auto-completed Guess Who Said It game %', v_game_instance.id;
          END IF;
        END IF;

      -- Single-phase games: auto-complete when everyone responds
      WHEN 'would_you_rather', 'hot_takes', 'most_likely_to' THEN
        UPDATE game_instances
        SET status = 'completed',
            metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{auto_completed}',
              'true'::jsonb
            )
        WHERE id = v_game_instance.id;

        RAISE NOTICE 'Auto-completed % game %', v_game_instance.game_type, v_game_instance.id;

      ELSE
        NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to check after each response
DROP TRIGGER IF EXISTS trigger_check_game_phase ON game_responses;
CREATE TRIGGER trigger_check_game_phase
  AFTER INSERT ON game_responses
  FOR EACH ROW
  EXECUTE FUNCTION check_and_advance_game_phase();

-- Add helpful comment
COMMENT ON FUNCTION check_and_advance_game_phase() IS
  'Automatically advances game phases when all group members have responded. Currently handles Guess Who Said It (submission -> guessing).';
