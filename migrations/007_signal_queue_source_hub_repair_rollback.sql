-- Migration 007 ROLLBACK: Revert source_hub CHECK constraint to original 4 values
-- Work Packet: wp-20260304-signal-queue-source-hub-check-repair

BEGIN;

ALTER TABLE lcs.signal_queue DROP CONSTRAINT chk_sq_source_hub;

ALTER TABLE lcs.signal_queue ADD CONSTRAINT chk_sq_source_hub
    CHECK (source_hub IN ('PEOPLE', 'DOL', 'BLOG', 'MANUAL'));

COMMIT;
