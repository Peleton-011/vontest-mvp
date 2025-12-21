-- Fix security issue: Remove group_invite_codes_with_stats view
-- Issue: View can bypass RLS policies and expose invite codes
--
-- Solution: Drop the view and query group_invite_codes table directly.
-- The base table already has proper RLS policies that filter by group membership.

DROP VIEW IF EXISTS group_invite_codes_with_stats;

-- Note: No replacement needed. The composable will query the base table
-- with joins, which respects RLS policies on group_invite_codes.
