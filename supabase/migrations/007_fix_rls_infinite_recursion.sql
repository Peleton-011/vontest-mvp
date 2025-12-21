-- Fix infinite recursion in group_members RLS policies
-- The issue: Policies were checking group_members table, which triggered the same policies again

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view members of their groups" ON group_members;
DROP POLICY IF EXISTS "Group admins can add members" ON group_members;
DROP POLICY IF EXISTS "Group admins can update member roles" ON group_members;
DROP POLICY IF EXISTS "Group admins can remove members or self-remove" ON group_members;

-- Create a SECURITY DEFINER function to check membership (bypasses RLS)
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
    AND user_id = p_user_id
  );
END;
$$;

-- Create a SECURITY DEFINER function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_group_admin(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
    AND user_id = p_user_id
    AND role = 'admin'
  );
END;
$$;

-- Recreate policies using the helper functions (no recursion)

-- Group members: Can view members of your groups
CREATE POLICY "Users can view members of their groups"
  ON group_members FOR SELECT
  USING (is_group_member(group_id, auth.uid()));

-- Group members: Admins can add members
CREATE POLICY "Group admins can add members"
  ON group_members FOR INSERT
  WITH CHECK (is_group_admin(group_id, auth.uid()));

-- Group members: Admins can update member roles
CREATE POLICY "Group admins can update member roles"
  ON group_members FOR UPDATE
  USING (is_group_admin(group_id, auth.uid()));

-- Group members: Admins can remove members, or members can remove themselves
CREATE POLICY "Group admins can remove members or self-remove"
  ON group_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    is_group_admin(group_id, auth.uid())
  );

-- Also fix the groups table policies that reference group_members

-- Drop existing policies
DROP POLICY IF EXISTS "Group admins can update groups" ON groups;
DROP POLICY IF EXISTS "Group admins can delete groups" ON groups;

-- Recreate using helper function
CREATE POLICY "Group admins can update groups"
  ON groups FOR UPDATE
  USING (is_group_admin(id, auth.uid()));

CREATE POLICY "Group admins can delete groups"
  ON groups FOR DELETE
  USING (is_group_admin(id, auth.uid()));
