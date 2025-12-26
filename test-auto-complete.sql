-- Troubleshooting script for auto-completion

-- 1. Check if the trigger exists
SELECT
    tgname as trigger_name,
    tgenabled as enabled,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'trigger_check_game_phase';

-- 2. Check if the function exists
SELECT
    proname as function_name,
    pronargs as num_args,
    prosrc as source_code_snippet
FROM pg_proc
WHERE proname = 'check_and_advance_game_phase';

-- 3. List all active games with their current state
SELECT
    id,
    game_type,
    status,
    current_phase,
    created_at,
    metadata
FROM game_instances
WHERE status = 'active'
ORDER BY created_at DESC;

-- 4. For each active game, count responses
SELECT
    gi.id as game_id,
    gi.game_type,
    gi.current_phase,
    gi.status,
    COUNT(DISTINCT gr.user_id) as response_count,
    (SELECT COUNT(*) FROM group_members WHERE group_id = gi.group_id) as total_members
FROM game_instances gi
LEFT JOIN game_responses gr ON gr.game_instance_id = gi.id
WHERE gi.status = 'active'
GROUP BY gi.id, gi.game_type, gi.current_phase, gi.status, gi.group_id;

-- 5. Check if any games should auto-complete
SELECT
    gi.id as game_id,
    gi.game_type,
    gi.current_phase,
    COUNT(DISTINCT gr.user_id) as responses,
    (SELECT COUNT(*) FROM group_members WHERE group_id = gi.group_id) as members,
    CASE
        WHEN COUNT(DISTINCT gr.user_id) >= (SELECT COUNT(*) FROM group_members WHERE group_id = gi.group_id)
        THEN 'SHOULD AUTO-COMPLETE'
        ELSE 'Waiting for more responses'
    END as status
FROM game_instances gi
LEFT JOIN game_responses gr ON gr.game_instance_id = gi.id
WHERE gi.status = 'active'
GROUP BY gi.id, gi.game_type, gi.current_phase, gi.group_id;
