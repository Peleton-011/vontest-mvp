# Cron Job Setup Guide

This guide explains how the automated daily game creation works and how to debug it.

## Architecture

**Simple & Direct Approach:**
```
pg_cron (every minute) → calls create_daily_games() SQL function directly
```

No edge functions, no auth headers, no HTTP calls. Everything happens in Postgres.

## How It Works

1. **pg_cron** runs every minute (configurable)
2. Calls `create_daily_games()` which:
   - Loops through all groups
   - Checks if each group is ready for a game using `should_create_game_for_group()`
   - Creates a game if:
     - Current time (in group's timezone) is within 1 hour of their notification_time
     - They don't already have an active game
     - They haven't created a game today
3. Posts a chat announcement when game is created

## Setup Instructions

### 1. Run the Migrations

```bash
# Apply migrations 016-018
npx supabase db push
```

Or manually run in Supabase SQL Editor:
- `016_setup_cron.sql` - Sets up the pg_cron job
- `017_improve_daily_games.sql` - Improves the game creation logic
- `018_cron_debug_helpers.sql` - Adds debugging tools

### 2. Verify Cron Extension

In Supabase SQL Editor:

```sql
-- Check if pg_cron is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

If not enabled, enable it:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 3. Check Job Status

```sql
-- View all scheduled jobs
SELECT * FROM cron.job;

-- Check if our job exists
SELECT * FROM cron.job WHERE jobname = 'daily-game-generator';
```

## Debugging

### Test Manually

Run the game creation manually to see if it works:

```sql
-- Test the function manually
SELECT test_daily_games();
```

This will return a JSON object showing:
- `created_games`: Number of games created
- `errors`: Number of errors
- `skipped`: Number of groups skipped (not time yet)
- `details`: Array with details for each group

### Check Cron Job Status

```sql
-- Check cron job status
SELECT * FROM check_cron_status();
```

Shows:
- When the job last ran
- What the status was (succeeded/failed)
- When it will run next

### View Recent Runs

```sql
-- View last 10 cron job runs
SELECT * FROM view_recent_cron_runs(10);
```

Shows history with:
- Run time
- Status
- Return message (error details if failed)
- Duration

### Check Group Scheduling

```sql
-- See which groups are ready for games
SELECT * FROM get_group_schedule_info();
```

Shows for each group:
- Their timezone and notification_time settings
- Current time in their timezone
- Whether they have an active game
- Whether they're ready for a new game

## Troubleshooting

### Problem: Cron job doesn't exist

**Solution:**
```sql
-- Manually create the job
SELECT cron.schedule(
  'daily-game-generator',
  '* * * * *',  -- Every minute (for testing)
  $$SELECT create_daily_games()$$
);
```

### Problem: Cron job runs but nothing happens

**Possible causes:**

1. **Groups not ready yet**
   ```sql
   SELECT * FROM get_group_schedule_info();
   ```
   Check the `ready_for_game` column. If all FALSE, then:
   - Current time might not be within 1 hour of notification_time
   - Groups already have active games
   - Games already created today

2. **No enabled games**
   ```sql
   SELECT name, settings->'enabled_games'
   FROM groups;
   ```
   Make sure groups have enabled games in settings.

3. **Timezone issues**
   ```sql
   SELECT
     name,
     settings->>'timezone' as tz,
     settings->>'notification_time' as notif_time,
     NOW() AT TIME ZONE COALESCE(settings->>'timezone', 'UTC') as current_time_in_tz
   FROM groups;
   ```
   Verify timezone strings are valid (e.g., 'America/New_York', 'UTC', 'Europe/London').

### Problem: Cron job fails with errors

Check the error message:
```sql
SELECT * FROM view_recent_cron_runs(5);
```

Common errors:
- **Permission denied**: Run `GRANT USAGE ON SCHEMA cron TO postgres;`
- **Function not found**: Make sure migration 015 ran successfully
- **Invalid timezone**: Check group settings have valid timezone strings

## Changing the Schedule

The job is set to run **every minute** for testing. To change it:

```sql
-- For daily at 9 AM:
SELECT cron.schedule(
  'daily-game-generator',
  '0 9 * * *',  -- 9 AM daily
  $$SELECT create_daily_games()$$
);

-- For every 5 minutes (testing):
SELECT cron.schedule(
  'daily-game-generator',
  '*/5 * * * *',  -- Every 5 minutes
  $$SELECT create_daily_games()$$
);

-- For hourly:
SELECT cron.schedule(
  'daily-game-generator',
  '0 * * * *',  -- Every hour at minute 0
  $$SELECT create_daily_games()$$
);
```

## Production Recommendations

1. **Run every hour instead of every minute:**
   ```sql
   SELECT cron.unschedule('daily-game-generator');
   SELECT cron.schedule(
     'daily-game-generator',
     '0 * * * *',  -- Every hour
     $$SELECT create_daily_games()$$
   );
   ```

2. **Widen the time window** in `should_create_game_for_group()`:
   - Current: 1 hour window
   - Change to 2-3 hours to catch more groups

3. **Set up monitoring:**
   - Check `view_recent_cron_runs()` periodically
   - Alert if job fails repeatedly

4. **Test with real groups:**
   - Set notification_time to current time + 5 minutes
   - Wait and check if game is created
   - Verify chat announcement appears

## Manual Game Creation

If you need to force create a game for a specific group:

```sql
-- Create game for a specific group
SELECT create_scheduled_game('GROUP_UUID_HERE');
```

## Testing Helpers

When testing game creation, you might hit the "one game per day" limit. Use these helpers:

### Debug Why Game Won't Create

```sql
-- See detailed status for a group
SELECT debug_game_creation('GROUP_UUID_HERE');
```

This shows:
- Current time in the group's timezone
- Whether a game was already created today
- Whether within the 1-hour time window
- What's blocking game creation

### Reset for Testing

```sql
-- Delete today's games for a group (allows creating another)
SELECT reset_todays_games('GROUP_UUID_HERE');

-- Clear all active games for a group
SELECT clear_active_games('GROUP_UUID_HERE');

-- Force create a game (bypasses time checks, but still checks for active games)
SELECT force_create_game('GROUP_UUID_HERE');
```

### Testing Workflow

To repeatedly test game creation:

```sql
-- 1. Debug to see what's blocking
SELECT debug_game_creation('GROUP_UUID_HERE');

-- 2. Clear today's games
SELECT reset_todays_games('GROUP_UUID_HERE');

-- 3. Try creating again
SELECT create_scheduled_game('GROUP_UUID_HERE');
```

Or just use the **"Start Game Now"** button in the UI - it bypasses all these checks!

## Logs and Monitoring

Monitor in Supabase Dashboard:
1. Go to Database → Scheduled Jobs
2. View job execution history
3. Check for failures

Or use SQL:
```sql
-- Recent runs with errors only
SELECT *
FROM view_recent_cron_runs(20)
WHERE status != 'succeeded';
```
