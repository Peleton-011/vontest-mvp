# Troubleshooting Auto-Completion

## Step 1: Apply Migrations

First, make sure the migrations are applied to your database:

### Option A: Reset database (WARNING: loses all data)
```bash
npx supabase db reset --local
```

### Option B: Apply pending migrations only
```bash
npx supabase migration up --local
```

### Option C: Manually apply migrations
```bash
# Find your local database connection string
# Usually: postgresql://postgres:postgres@localhost:54322/postgres

# Apply migration 025
psql "YOUR_CONNECTION_STRING" -f supabase/migrations/025_fix_game_phases.sql

# Apply migration 026
psql "YOUR_CONNECTION_STRING" -f supabase/migrations/026_auto_phase_transitions.sql
```

## Step 2: Verify Trigger Installation

Run the troubleshooting script:

```bash
psql "YOUR_CONNECTION_STRING" -f test-auto-complete.sql
```

### Expected Output:

1. **Trigger exists**: You should see `trigger_check_game_phase` with `enabled = O` (Origin = enabled)
2. **Function exists**: You should see `check_and_advance_game_phase`
3. **Active games**: List of current games
4. **Response counts**: Should show how many responses each game has

## Step 3: Manual Test

### Test Auto-Completion Manually

```sql
-- Get a test group ID (replace with your actual group ID)
SELECT id FROM groups LIMIT 1;

-- Create a test game
SELECT test_hot_takes_game('YOUR_GROUP_ID_HERE');

-- Check the game was created
SELECT id, game_type, status, current_phase
FROM game_instances
WHERE group_id = 'YOUR_GROUP_ID_HERE'
AND status = 'active';

-- Simulate all users responding
-- Get the game ID from above
-- Get all user IDs in the group
SELECT user_id FROM group_members WHERE group_id = 'YOUR_GROUP_ID_HERE';

-- For each user, insert a response
INSERT INTO game_responses (game_instance_id, user_id, response_data)
VALUES
('YOUR_GAME_ID', 'USER_ID_1', '{"stance": "agree", "reasoning": "test"}'),
('YOUR_GAME_ID', 'USER_ID_2', '{"stance": "disagree", "reasoning": "test"}');

-- The trigger should fire and complete the game automatically
-- Check if it worked:
SELECT id, status, metadata
FROM game_instances
WHERE id = 'YOUR_GAME_ID';

-- Expected: status = 'completed' and metadata contains {"auto_completed": true}
```

## Step 4: Check Logs

Enable PostgreSQL logging to see if the trigger is firing:

```sql
-- Check for notices
SHOW log_min_messages;

-- Set to notice level
SET log_min_messages TO 'notice';

-- Now try adding a response and check logs
```

## Step 5: Common Issues

### Issue: "Trigger not firing"

**Check 1**: Is the trigger enabled?
```sql
SELECT tgenabled FROM pg_trigger WHERE tgname = 'trigger_check_game_phase';
```

**Check 2**: Does the function have correct permissions?
```sql
-- The function should be SECURITY DEFINER
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'check_and_advance_game_phase';
```

**Fix**: Re-apply migration 026

### Issue: "Games not completing even with all responses"

**Check**: Count responses vs members
```sql
SELECT
    gi.id,
    COUNT(DISTINCT gr.user_id) as responses,
    (SELECT COUNT(*) FROM group_members WHERE group_id = gi.group_id) as members
FROM game_instances gi
LEFT JOIN game_responses gr ON gr.game_instance_id = gi.id
WHERE gi.id = 'YOUR_GAME_ID'
GROUP BY gi.id, gi.group_id;
```

If responses < members, not all users have responded yet.

### Issue: "Guess Who Said It not advancing to guessing phase"

**Check**: Are all responses submitted?
```sql
SELECT
    COUNT(DISTINCT user_id) as submitted,
    (SELECT COUNT(*) FROM group_members WHERE group_id =
        (SELECT group_id FROM game_instances WHERE id = 'GAME_ID')) as total
FROM game_responses
WHERE game_instance_id = 'GAME_ID';
```

**Manually advance** (for testing):
```sql
UPDATE game_instances
SET current_phase = 'guessing'
WHERE id = 'GAME_ID';
```

### Issue: "Frontend not updating"

**Check 1**: Are you subscribed to realtime changes?
- Open browser dev console
- Look for Supabase realtime connection messages

**Check 2**: Refresh the page
- The subscription is set up in `onMounted`, so a refresh will reconnect

**Check 3**: Check Supabase realtime is enabled
- Go to Supabase Dashboard → Project Settings → API
- Ensure Realtime is enabled

## Step 6: Force Trigger to Run

If you have an existing game with all responses but it hasn't completed:

```sql
-- Get the game ID
SELECT id FROM game_instances WHERE status = 'active';

-- Get a response ID from that game
SELECT id FROM game_responses WHERE game_instance_id = 'YOUR_GAME_ID' LIMIT 1;

-- Manually trigger the function by updating a response
UPDATE game_responses
SET updated_at = NOW()
WHERE game_instance_id = 'YOUR_GAME_ID'
LIMIT 1;

-- This should fire the trigger on UPDATE
```

## Step 7: Nuclear Option - Recreate Trigger

If nothing works, drop and recreate:

```sql
-- Drop trigger
DROP TRIGGER IF EXISTS trigger_check_game_phase ON game_responses;

-- Recreate function and trigger
-- Copy the entire contents of 026_auto_phase_transitions.sql and run it
```

## Quick Test Command

Run this to quickly test everything:

```bash
# In your terminal
psql "YOUR_CONNECTION_STRING" << 'EOF'
-- Check trigger
SELECT COUNT(*) as trigger_exists FROM pg_trigger WHERE tgname = 'trigger_check_game_phase';

-- Check function
SELECT COUNT(*) as function_exists FROM pg_proc WHERE proname = 'check_and_advance_game_phase';

-- Show active games
SELECT id, game_type, status, current_phase FROM game_instances WHERE status = 'active';
EOF
```

## Getting Your Connection String

### Local Supabase:
```bash
# Default local connection
postgresql://postgres:postgres@localhost:54322/postgres
```

### Check if Supabase is running:
```bash
npx supabase status
```

This will show your DB URL.
