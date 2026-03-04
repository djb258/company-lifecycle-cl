-- Migration 007: Repair lcs.signal_queue source_hub CHECK constraint
-- Work Packet: wp-20260304-signal-queue-source-hub-check-repair
-- Direction: FORWARD
-- Adds OUTREACH and SYSTEM to allowed source_hub values

BEGIN;

ALTER TABLE lcs.signal_queue DROP CONSTRAINT chk_sq_source_hub;

ALTER TABLE lcs.signal_queue ADD CONSTRAINT chk_sq_source_hub
    CHECK (source_hub IN ('PEOPLE', 'DOL', 'BLOG', 'MANUAL', 'OUTREACH', 'SYSTEM'));

COMMIT;
