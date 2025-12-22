-- Add 'game_general' to allowed thread types
-- This allows group chat threads to be created

-- Step 1: Drop the existing constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'threads_type_check'
    AND table_name = 'threads'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE threads DROP CONSTRAINT threads_type_check;
    RAISE NOTICE 'Dropped existing threads_type_check constraint';
  END IF;
END $$;

-- Step 2: Add new constraint with all known types
-- Including types that might already exist in the database
ALTER TABLE threads ADD CONSTRAINT threads_type_check
  CHECK (type IN (
    'post',
    'vontest',
    'comment',
    'question',       -- Might exist from vontests
    'answer',         -- Might exist from vontests
    'debate',         -- Might exist from debates
    'game_instance',
    'debate_match',
    'game_general'    -- NEW: Group chat threads
  ));

COMMENT ON CONSTRAINT threads_type_check ON threads IS
  'Allowed thread types for various features in the app';

