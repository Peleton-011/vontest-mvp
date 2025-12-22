-- Diagnostic query to check existing thread types
-- Run this in Supabase SQL Editor to see what types currently exist

-- 1. Check all unique thread types currently in the database
SELECT DISTINCT type, COUNT(*) as count
FROM threads
GROUP BY type
ORDER BY count DESC;

-- 2. Check the current constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
AND constraint_name = 'threads_type_check';

-- 3. Sample of threads table
SELECT id, type, reference_id, created_at
FROM threads
ORDER BY created_at DESC
LIMIT 10;
