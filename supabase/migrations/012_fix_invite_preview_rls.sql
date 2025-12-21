-- Fix get_group_from_invite_code to allow non-members to preview groups
-- Issue: RLS on groups table prevents non-members from viewing group info
-- Solution: Add SECURITY DEFINER to bypass RLS (safe because function validates invite code)

-- Recreate function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_group_from_invite_code(p_code TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Query group info through valid invite code
  -- This is safe to bypass RLS because:
  -- 1. Only returns data for valid, active, non-expired codes
  -- 2. Only returns basic group info (name, description, member count)
  -- 3. Doesn't expose sensitive data
  SELECT jsonb_build_object(
    'group_id', g.id,
    'group_name', g.name,
    'group_description', g.description,
    'member_count', (SELECT COUNT(*) FROM group_members WHERE group_id = g.id),
    'is_active', gic.is_active,
    'expires_at', gic.expires_at,
    'uses_count', gic.uses_count,
    'max_uses', gic.max_uses
  ) INTO v_result
  FROM group_invite_codes gic
  JOIN groups g ON g.id = gic.group_id
  WHERE gic.code = p_code
  AND gic.is_active = true
  AND (gic.expires_at IS NULL OR gic.expires_at > NOW());

  RETURN COALESCE(v_result, jsonb_build_object('error', 'Invalid or expired invite code'));
END;
$$;

COMMENT ON FUNCTION get_group_from_invite_code(TEXT) IS 'Get group info from invite code without joining (bypasses RLS for preview)';
