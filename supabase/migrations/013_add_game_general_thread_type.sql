-- Add 'game_general' to allowed thread types
-- This allows group chat threads to be created

-- Drop existing check constraint if it exists
ALTER TABLE threads DROP CONSTRAINT IF EXISTS threads_type_check;

-- Add new check constraint with 'game_general' included
ALTER TABLE threads ADD CONSTRAINT threads_type_check
  CHECK (type IN (
    'post',           -- Original thread types
    'vontest',
    'comment',
    'game_instance',  -- Added in migration 004
    'debate_match',   -- Added in migration 004
    'game_general'    -- NEW: Group chat threads
  ));

COMMENT ON CONSTRAINT threads_type_check ON threads IS
  'Allowed thread types: post, vontest, comment, game_instance, debate_match, game_general';
