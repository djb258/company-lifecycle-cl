-- Migration 008 ROLLBACK: Remove catch-all OUTREACH frame
-- Work Packet: wp-20260304-outreach-catchall-frame

BEGIN;

DELETE FROM lcs.frame_registry WHERE frame_id = 'OUT-GENERAL-V1';

COMMIT;
