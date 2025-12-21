-- Fix RLS policy to allow creators to view their own groups immediately after creation
-- Issue: When creating a group, the .select() happens before the trigger adds the user to group_members
-- This causes a 403 error because the SELECT policy only checks group_members

-- Drop and recreate the SELECT policy for groups
DROP POLICY IF EXISTS "Users can view groups they belong to" ON groups;

CREATE POLICY "Users can view groups they belong to"
  ON groups FOR SELECT
  USING (
    -- Allow creator to see their own group immediately
    created_by = auth.uid()
    OR
    -- Allow members to see groups they belong to
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );
