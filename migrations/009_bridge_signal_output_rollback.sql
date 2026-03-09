-- Migration 009 ROLLBACK: Remove lcs.bridge_signal_output() function
-- Work Packet: wp-20260304-bridge-signal-output-to-lcs-queue

BEGIN;

DROP FUNCTION IF EXISTS lcs.bridge_signal_output();

COMMIT;
