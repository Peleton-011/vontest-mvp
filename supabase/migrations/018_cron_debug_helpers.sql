-- ==========================================
-- Migration: Debugging helpers for cron jobs
-- ==========================================

-- Function to manually test game creation
CREATE OR REPLACE FUNCTION test_daily_games()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Call the same function that cron calls
  v_result := create_daily_games();

  RAISE NOTICE 'Test Results: %', v_result;

  RETURN v_result;
END;
$$;

-- Function to check cron job status
CREATE OR REPLACE FUNCTION check_cron_status()
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

-- Function to view recent cron job runs
CREATE OR REPLACE FUNCTION view_recent_cron_runs(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  run_time TIMESTAMPTZ,
  status TEXT,
  return_message TEXT,
  duration INTERVAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.start_time::TIMESTAMPTZ,
    r.status::TEXT,
    r.return_message::TEXT,
    (r.end_time - r.start_time)::INTERVAL
  FROM cron.job_run_details r
  JOIN cron.job j ON r.jobid = j.jobid
  WHERE j.jobname = 'daily-game-generator'
  ORDER BY r.start_time DESC
  LIMIT limit_count;
END;
$$;

-- Function to get group scheduling info
CREATE OR REPLACE FUNCTION get_group_schedule_info()
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  timezone TEXT,
  notification_time TIME,
  current_time_in_tz TIME,
  enabled_games JSONB,
  has_active_game BOOLEAN,
  ready_for_game BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    COALESCE(g.settings->>'timezone', 'UTC')::TEXT,
    (g.settings->>'notification_time')::TIME,
    (NOW() AT TIME ZONE COALESCE(g.settings->>'timezone', 'UTC'))::TIME,
    (g.settings->'enabled_games')::JSONB,
    has_active_game(g.id),
    should_create_game_for_group(g.id)
  FROM groups g
  WHERE (g.settings->>'enabled_games')::jsonb IS NOT NULL;
END;
$$;

COMMENT ON FUNCTION test_daily_games IS 'Manually test the daily game creation (useful for debugging)';
COMMENT ON FUNCTION check_cron_status IS 'View the status of the cron job';
COMMENT ON FUNCTION view_recent_cron_runs IS 'View recent cron job execution history';
COMMENT ON FUNCTION get_group_schedule_info IS 'View scheduling info for all groups';
