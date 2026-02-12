-- ═══════════════════════════════════════════════════════════════
-- LCS Cron Schedule v2.2.0
-- Run AFTER: 001, 002, 003 migrations
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Generated: 2026-02-12
--
-- Prerequisites:
--   pg_cron extension must be enabled (Supabase enables by default)
--   All lcs.* tables and functions must exist
--
-- IMPORTANT: pg_cron jobs run as superuser in the 'postgres' database.
--   For Supabase, use the Supabase dashboard or SQL Editor to schedule.
--
-- Execution:
--   psql $NEON_CONNECTION_STRING -f migrations/lcs/004_lcs_cron_schedule.sql
-- ═══════════════════════════════════════════════════════════════

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ═══ 1. Matview Refresh: Intelligence (2:00 AM ET daily) ═════
-- 2:00 AM ET = 7:00 AM UTC (EST) / 6:00 AM UTC (EDT)
-- Using 7:00 AM UTC (conservative — EST baseline)
SELECT cron.schedule(
    'lcs-refresh-intelligence',
    '0 7 * * *',
    $$SELECT lcs.refresh_lcs_matview('lcs.v_company_intelligence')$$
);

-- ═══ 2. Matview Refresh: Entity + Company (2:30 AM ET daily) ═
SELECT cron.schedule(
    'lcs-refresh-entity',
    '30 7 * * *',
    $$SELECT lcs.refresh_lcs_matview('lcs.v_latest_by_entity')$$
);

SELECT cron.schedule(
    'lcs-refresh-company',
    '30 7 * * *',
    $$SELECT lcs.refresh_lcs_matview('lcs.v_latest_by_company')$$
);

-- ═══ 3. Signal Bridge (every 15 min, business hours Mon-Fri) ═
-- Business hours: 8 AM–6 PM ET = 13:00–23:00 UTC (EST)
SELECT cron.schedule(
    'lcs-signal-bridge',
    '*/15 13-23 * * 1-5',
    $$SELECT * FROM lcs.bridge_pressure_signals()$$
);

-- ═══ 4. Pipeline Runner ═════════════════════════════════════
-- The pipeline runner is a TypeScript Edge Function, not SQL.
-- pg_cron cannot call Edge Functions directly.
--
-- OPTION A (recommended): Supabase cron via dashboard
--   Edge Functions → Cron Triggers → lcs-pipeline-runner
--   Schedule: */5 13-23 * * 1-5
--
-- OPTION B: pg_cron + pg_net HTTP call
-- Uncomment after enabling pg_net extension:
--
-- CREATE EXTENSION IF NOT EXISTS pg_net;
-- SELECT cron.schedule(
--     'lcs-pipeline-runner',
--     '*/5 13-23 * * 1-5',
--     $$SELECT net.http_post(
--         url := current_setting('app.settings.supabase_url') || '/functions/v1/lcs-pipeline-runner',
--         headers := jsonb_build_object(
--             'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--             'Content-Type', 'application/json'
--         ),
--         body := '{"batch_size": 50}'
--     )$$
-- );

-- ═══ 5. Daily Adapter Reset (midnight ET = 5:00 AM UTC) ══════
SELECT cron.schedule(
    'lcs-adapter-reset',
    '0 5 * * *',
    $$UPDATE lcs.adapter_registry SET sent_today = 0, updated_at = NOW()$$
);

-- ═══ 6. Signal Queue Cleanup (Sunday 3:00 AM ET = 8:00 AM UTC)
SELECT cron.schedule(
    'lcs-queue-cleanup',
    '0 8 * * 0',
    $$DELETE FROM lcs.signal_queue
      WHERE status IN ('COMPLETED', 'FAILED', 'SKIPPED')
        AND processed_at < NOW() - INTERVAL '30 days'$$
);

-- ═══ 7. Monthly CET Partition Creator (1st of month, 1 AM ET)
SELECT cron.schedule(
    'lcs-create-partition',
    '0 6 1 * *',
    $$DO $body$
    DECLARE
        next_month DATE := DATE_TRUNC('month', NOW()) + INTERVAL '2 months';
        partition_name TEXT;
        start_date TEXT;
        end_date TEXT;
    BEGIN
        partition_name := 'event_' || TO_CHAR(next_month, 'YYYY_MM');
        start_date := TO_CHAR(next_month, 'YYYY-MM-DD');
        end_date := TO_CHAR(next_month + INTERVAL '1 month', 'YYYY-MM-DD');

        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'lcs'
              AND c.relname = partition_name
        ) THEN
            EXECUTE format(
                'CREATE TABLE lcs.%I PARTITION OF lcs.event FOR VALUES FROM (%L) TO (%L)',
                partition_name, start_date, end_date
            );
            RAISE NOTICE 'Created partition lcs.%', partition_name;
        END IF;
    END
    $body$$$
);

-- ═══ Verification ════════════════════════════════════════════
-- SELECT * FROM cron.job ORDER BY jobid;
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
-- SELECT cron.unschedule('lcs-refresh-intelligence');  -- to remove a job
