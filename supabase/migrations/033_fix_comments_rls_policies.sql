-- ==========================================
-- Fix Comments RLS Policies
-- ==========================================
-- This fixes database permission errors when creating/reading comments
-- Error: "permission denied for table comments" or similar

-- First, ensure RLS is enabled on comments table
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Users can view comments in threads they have access to" ON comments;
DROP POLICY IF EXISTS "Users can insert comments in threads they have access to" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
DROP POLICY IF EXISTS "System can insert comments" ON comments;

DROP POLICY IF EXISTS "Users can view comment links in threads they have access to" ON comment_links;
DROP POLICY IF EXISTS "Users can insert comment links in threads they have access to" ON comment_links;
DROP POLICY IF EXISTS "Users can delete comment links they created" ON comment_links;

-- ==========================================
-- COMMENTS TABLE POLICIES
-- ==========================================

-- Policy: View comments in accessible threads
-- Users can see comments in threads that belong to groups they're members of
CREATE POLICY "Users can view comments in threads they have access to"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM threads t
      WHERE t.id = comments.thread_id
      AND (
        -- Game instance threads
        (t.type = 'game_instance' AND EXISTS (
          SELECT 1 FROM game_instances gi
          JOIN group_members gm ON gm.group_id = gi.group_id
          WHERE gi.id = t.reference_id
          AND gm.user_id = auth.uid()
        ))
        OR
        -- General group chat threads
        (t.type = 'game_general' AND EXISTS (
          SELECT 1 FROM group_members gm
          WHERE gm.group_id = t.reference_id
          AND gm.user_id = auth.uid()
        ))
        OR
        -- Debate match threads
        (t.type = 'debate_match' AND EXISTS (
          SELECT 1 FROM debate_matches dm
          JOIN game_instances gi ON gi.id = dm.game_instance_id
          JOIN group_members gm ON gm.group_id = gi.group_id
          WHERE dm.id = t.reference_id
          AND gm.user_id = auth.uid()
        ))
      )
    )
  );

-- Policy: Insert comments in accessible threads
-- Users can post comments in threads that belong to groups they're members of
CREATE POLICY "Users can insert comments in threads they have access to"
  ON comments FOR INSERT
  WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    AND
    -- User must be commenting as themselves (or NULL for system messages)
    (user_id = auth.uid() OR user_id IS NULL)
    AND
    EXISTS (
      SELECT 1 FROM threads t
      WHERE t.id = comments.thread_id
      AND (
        -- Game instance threads
        (t.type = 'game_instance' AND EXISTS (
          SELECT 1 FROM game_instances gi
          JOIN group_members gm ON gm.group_id = gi.group_id
          WHERE gi.id = t.reference_id
          AND gm.user_id = auth.uid()
        ))
        OR
        -- General group chat threads
        (t.type = 'game_general' AND EXISTS (
          SELECT 1 FROM group_members gm
          WHERE gm.group_id = t.reference_id
          AND gm.user_id = auth.uid()
        ))
        OR
        -- Debate match threads
        (t.type = 'debate_match' AND EXISTS (
          SELECT 1 FROM debate_matches dm
          JOIN game_instances gi ON gi.id = dm.game_instance_id
          JOIN group_members gm ON gm.group_id = gi.group_id
          WHERE dm.id = t.reference_id
          AND gm.user_id = auth.uid()
        ))
      )
    )
  );

-- Policy: Update own comments
-- Users can edit their own comments only
CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Delete own comments
-- Users can delete their own comments only
CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  USING (user_id = auth.uid());

-- Policy: Allow system to insert comments
-- This allows edge functions and triggers to insert system messages
CREATE POLICY "System can insert comments"
  ON comments FOR INSERT
  WITH CHECK (
    user_id IS NULL
    AND message_type IN ('system', 'game_announcement')
  );

-- ==========================================
-- COMMENT_LINKS TABLE POLICIES
-- ==========================================

-- Policy: View comment links in accessible threads
CREATE POLICY "Users can view comment links in threads they have access to"
  ON comment_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM threads t
      WHERE t.id = comment_links.thread_id
      AND (
        -- Game instance threads
        (t.type = 'game_instance' AND EXISTS (
          SELECT 1 FROM game_instances gi
          JOIN group_members gm ON gm.group_id = gi.group_id
          WHERE gi.id = t.reference_id
          AND gm.user_id = auth.uid()
        ))
        OR
        -- General group chat threads
        (t.type = 'game_general' AND EXISTS (
          SELECT 1 FROM group_members gm
          WHERE gm.group_id = t.reference_id
          AND gm.user_id = auth.uid()
        ))
        OR
        -- Debate match threads
        (t.type = 'debate_match' AND EXISTS (
          SELECT 1 FROM debate_matches dm
          JOIN game_instances gi ON gi.id = dm.game_instance_id
          JOIN group_members gm ON gm.group_id = gi.group_id
          WHERE dm.id = t.reference_id
          AND gm.user_id = auth.uid()
        ))
      )
    )
  );

-- Policy: Insert comment links in accessible threads
CREATE POLICY "Users can insert comment links in threads they have access to"
  ON comment_links FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND
    EXISTS (
      SELECT 1 FROM threads t
      WHERE t.id = comment_links.thread_id
      AND (
        -- Game instance threads
        (t.type = 'game_instance' AND EXISTS (
          SELECT 1 FROM game_instances gi
          JOIN group_members gm ON gm.group_id = gi.group_id
          WHERE gi.id = t.reference_id
          AND gm.user_id = auth.uid()
        ))
        OR
        -- General group chat threads
        (t.type = 'game_general' AND EXISTS (
          SELECT 1 FROM group_members gm
          WHERE gm.group_id = t.reference_id
          AND gm.user_id = auth.uid()
        ))
        OR
        -- Debate match threads
        (t.type = 'debate_match' AND EXISTS (
          SELECT 1 FROM debate_matches dm
          JOIN game_instances gi ON gi.id = dm.game_instance_id
          JOIN group_members gm ON gm.group_id = gi.group_id
          WHERE dm.id = t.reference_id
          AND gm.user_id = auth.uid()
        ))
      )
    )
  );

-- Policy: Delete comment links
-- Users can delete links to comments they own
CREATE POLICY "Users can delete comment links they created"
  ON comment_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM comments c
      WHERE c.id = comment_links.child_id
      AND c.user_id = auth.uid()
    )
  );

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON POLICY "Users can view comments in threads they have access to" ON comments IS 'Allows users to view comments in game/group threads they are members of';
COMMENT ON POLICY "Users can insert comments in threads they have access to" ON comments IS 'Allows users to post comments in threads for their groups';
COMMENT ON POLICY "Users can update their own comments" ON comments IS 'Allows users to edit their own comments';
COMMENT ON POLICY "Users can delete their own comments" ON comments IS 'Allows users to delete their own comments';
COMMENT ON POLICY "System can insert comments" ON comments IS 'Allows automated system messages to be posted';
