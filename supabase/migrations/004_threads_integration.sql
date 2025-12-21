-- ==========================================
-- MIGRATION 004: Threads Integration
-- ==========================================
-- Description: Extends thread system to support game discussions
-- Run this after 003_mvp_enhanced_features.sql

-- ==========================================
-- NOTES
-- ==========================================
-- Your existing threads table has:
--   - id (UUID)
--   - reference_id (UUID) - points to the related entity
--   - type (TEXT) - indicates what kind of thread it is
--
-- We're adding new thread types:
--   - 'game_instance' -> reference_id points to game_instances.id
--   - 'game_general' -> reference_id points to groups.id (general group chat)
--   - 'debate_match' -> reference_id points to debate_matches.id
--
-- No schema changes needed! Just documenting the new types and adding helper functions.

-- ==========================================
-- FUNCTIONS FOR THREAD MANAGEMENT
-- ==========================================

-- Create thread for a game instance
CREATE OR REPLACE FUNCTION create_game_thread(p_game_instance_id UUID)
RETURNS UUID AS $$
DECLARE
  thread_id UUID;
BEGIN
  INSERT INTO threads (reference_id, type)
  VALUES (p_game_instance_id, 'game_instance')
  RETURNING id INTO thread_id;

  RETURN thread_id;
END;
$$ LANGUAGE plpgsql;

-- Create thread for a debate match
CREATE OR REPLACE FUNCTION create_debate_thread(p_debate_match_id UUID)
RETURNS UUID AS $$
DECLARE
  thread_id UUID;
BEGIN
  INSERT INTO threads (reference_id, type)
  VALUES (p_debate_match_id, 'debate_match')
  RETURNING id INTO thread_id;

  RETURN thread_id;
END;
$$ LANGUAGE plpgsql;

-- Create general group chat thread
CREATE OR REPLACE FUNCTION create_group_chat_thread(p_group_id UUID)
RETURNS UUID AS $$
DECLARE
  thread_id UUID;
BEGIN
  -- Check if thread already exists
  SELECT id INTO thread_id
  FROM threads
  WHERE reference_id = p_group_id
  AND type = 'game_general';

  IF thread_id IS NULL THEN
    INSERT INTO threads (reference_id, type)
    VALUES (p_group_id, 'game_general')
    RETURNING id INTO thread_id;
  END IF;

  RETURN thread_id;
END;
$$ LANGUAGE plpgsql;

-- Get thread for a game instance
CREATE OR REPLACE FUNCTION get_game_thread(p_game_instance_id UUID)
RETURNS UUID AS $$
DECLARE
  thread_id UUID;
BEGIN
  SELECT id INTO thread_id
  FROM threads
  WHERE reference_id = p_game_instance_id
  AND type = 'game_instance';

  RETURN thread_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ==========================================
-- TRIGGER TO AUTO-CREATE GAME THREADS
-- ==========================================

-- Function to automatically create thread when game instance is created
CREATE OR REPLACE FUNCTION create_thread_for_new_game()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_game_thread(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run the function
CREATE TRIGGER on_game_instance_created
  AFTER INSERT ON game_instances
  FOR EACH ROW
  EXECUTE FUNCTION create_thread_for_new_game();

-- ==========================================
-- TRIGGER TO AUTO-CREATE DEBATE THREADS
-- ==========================================

-- Function to automatically create thread when debate match is created
CREATE OR REPLACE FUNCTION create_thread_for_new_debate()
RETURNS TRIGGER AS $$
DECLARE
  new_thread_id UUID;
BEGIN
  SELECT create_debate_thread(NEW.id) INTO new_thread_id;

  -- Update the debate match with thread_id
  UPDATE debate_matches
  SET thread_id = new_thread_id
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run the function
CREATE TRIGGER on_debate_match_created
  AFTER INSERT ON debate_matches
  FOR EACH ROW
  EXECUTE FUNCTION create_thread_for_new_debate();

-- ==========================================
-- VIEWS FOR CONVENIENCE
-- ==========================================

-- View to see games with their threads
-- CREATE OR REPLACE VIEW game_instances_with_threads AS
-- SELECT
--   gi.*,
--   t.id as thread_id
-- FROM game_instances gi
-- LEFT JOIN threads t ON t.reference_id = gi.id AND t.type = 'game_instance';

-- View to see debate matches with their threads
-- CREATE OR REPLACE VIEW debate_matches_with_threads AS
-- SELECT
--   dm.*,
--   t.id as thread_id
-- FROM debate_matches dm
-- LEFT JOIN threads t ON t.reference_id = dm.id AND t.type = 'debate_match';

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON FUNCTION create_game_thread(UUID) IS 'Creates a discussion thread for a game instance';
COMMENT ON FUNCTION create_debate_thread(UUID) IS 'Creates a discussion thread for a debate match';
COMMENT ON FUNCTION create_group_chat_thread(UUID) IS 'Creates or returns general chat thread for a group';
COMMENT ON FUNCTION get_game_thread(UUID) IS 'Gets the thread ID for a game instance';

COMMENT ON VIEW game_instances_with_threads IS 'Game instances joined with their discussion threads';
COMMENT ON VIEW debate_matches_with_threads IS 'Debate matches joined with their discussion threads';
