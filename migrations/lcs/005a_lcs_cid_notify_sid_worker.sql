-- ═══════════════════════════════════════════════════════════════
-- LCS CID → SID Worker Notification Trigger
-- Patch to migration 005 — adds pg_notify for Phase 3 DB trigger
-- Authority: HUB-CL-001, SUBHUB-CL-LCS, SH-LCS-PIPELINE
-- Work Packet: wp-20260303-lcs-cid-sid-mid-pipeline (Phase 3)
-- Generated: 2026-03-03
--
-- Purpose:
--   When a COMPILED CID row is inserted, fire pg_notify on channel
--   'lcs_sid_worker' with the communication_id and context.
--   This enables near-real-time SID message construction without
--   waiting for the next cron cycle.
--
-- Execution:
--   doppler run -- psql $VITE_DATABASE_URL -f migrations/lcs/005a_lcs_cid_notify_sid_worker.sql
--
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_lcs_cid_notify_sid_worker ON lcs.cid;
--   DROP FUNCTION IF EXISTS lcs.notify_sid_worker();
--
-- Prerequisites:
--   lcs.cid table must exist (from migration 005)
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- SID worker trigger: emit pg_notify when COMPILED CID is inserted
CREATE OR REPLACE FUNCTION lcs.notify_sid_worker()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.compilation_status = 'COMPILED' THEN
        PERFORM pg_notify(
            'lcs_sid_worker',
            json_build_object(
                'communication_id', NEW.communication_id,
                'signal_queue_id', NEW.signal_queue_id,
                'sovereign_company_id', NEW.sovereign_company_id,
                'created_at', NEW.created_at
            )::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lcs_cid_notify_sid_worker
    AFTER INSERT ON lcs.cid
    FOR EACH ROW
    EXECUTE FUNCTION lcs.notify_sid_worker();

COMMENT ON FUNCTION lcs.notify_sid_worker() IS 'Phase 3 DB trigger: fires pg_notify on lcs_sid_worker channel when a COMPILED CID is inserted. Enables near-real-time SID message construction.';

COMMIT;
