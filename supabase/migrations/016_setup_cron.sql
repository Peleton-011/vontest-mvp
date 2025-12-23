-- ==========================================
-- Migration: Set up pg_cron for daily games
-- ==========================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant permissions to postgres user for cron operations
-- This allows the scheduler to run
GRANT USAGE ON SCHEMA cron TO postgres;

-- Remove any existing job with this name (idempotent)
SELECT cron.unschedule('daily-game-generator')
WHERE jobid IN (
  SELECT jobid FROM cron.job WHERE jobname = 'daily-game-generator'
);

-- Schedule the job to run every minute
-- In production, you'd change this to run once daily at a specific time
-- For example: '0 9 * * *' for 9 AM daily
SELECT cron.schedule(
  'daily-game-generator',        -- Job name
  '* * * * *',                    -- Every minute (for testing)
  $$SELECT create_daily_games()$$ -- SQL to execute
);

-- View scheduled jobs
-- SELECT * FROM cron.job;

-- View job run history
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';
