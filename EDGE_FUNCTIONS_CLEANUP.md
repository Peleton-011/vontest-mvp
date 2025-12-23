# Edge Functions Cleanup

## What to Delete

You mentioned you have these edge functions in the Supabase web dashboard:
- `cron-proxy`
- `daily-game-generator`

**Yes, you should delete them.** They're no longer needed.

## Why Delete Them?

The new cron system uses a **direct approach**:
```
pg_cron → create_daily_games() SQL function
```

Instead of the old complex chain:
```
pg_cron → cron-proxy edge function → daily-game-generator edge function → create_daily_games()
```

## How to Delete Edge Functions in Supabase

### Via Dashboard
1. Go to **Edge Functions** in your Supabase project
2. Find `cron-proxy` and `daily-game-generator`
3. Click the delete/trash icon for each
4. Confirm deletion

### Via CLI (if you have it set up)
```bash
supabase functions delete cron-proxy
supabase functions delete daily-game-generator
```

## What About the Cron Job Calling Them?

If you have a pg_cron job that's still calling the old edge functions via HTTP, you should delete that too:

```sql
-- Check for old jobs
SELECT * FROM cron.job WHERE command LIKE '%http_post%';

-- Delete the old job if it exists
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE command LIKE '%http_post%';
```

The new cron job (created by migration 016) is:
```sql
SELECT * FROM cron.job WHERE jobname = 'daily-game-generator';
```

It should show `command` as `SELECT create_daily_games()` (no HTTP calls).

## Benefits of the New Approach

✅ **Simpler**: No edge functions to maintain
✅ **More reliable**: No HTTP timeouts or network issues
✅ **Cheaper**: Edge functions have execution costs
✅ **Easier to debug**: Everything visible in SQL
✅ **No secrets needed**: No auth headers or environment variables

## If You Want to Keep Edge Functions

If you prefer the edge function approach for some reason (monitoring, external triggers, etc.), you can keep them. But you'll need to:

1. Create the function files in your repo at `supabase/functions/`
2. Deploy them via CLI
3. Keep the secrets configured

But honestly, the direct SQL approach is better for this use case.
