-- ==========================================
-- Migration: Fix check_cron_status function
-- ==========================================

-- Drop the old function first to clear any cached version
DROP FUNCTION IF EXISTS check_cron_status();

-- Recreate without the problematic schedule_to_next_run call
CREATE FUNCTION check_cron_status()
RETURNS TABLE (
  job_name TEXT,
  schedule TEXT,
  last_run TIMESTAMPTZ,
  last_status TEXT,
  command TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobname::TEXT,
    j.schedule::TEXT,
    (SELECT MAX(start_time) FROM cron.job_run_details WHERE jobid = j.jobid)::TIMESTAMPTZ as last_run,
    (SELECT status FROM cron.job_run_details WHERE jobid = j.jobid ORDER BY start_time DESC LIMIT 1)::TEXT as last_status,
    j.command::TEXT
  FROM cron.job j
  WHERE j.jobname = 'daily-game-generator';
END;
$$;

COMMENT ON FUNCTION check_cron_status IS 'View the status of the cron job';
