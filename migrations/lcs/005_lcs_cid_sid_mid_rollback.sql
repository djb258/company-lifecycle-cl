-- ═══════════════════════════════════════════════════════════════
-- ROLLBACK: LCS CID/SID/MID Pipeline Tables v1.0.0
-- Reverses: 005_lcs_cid_sid_mid.sql
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Work Packet: wp-20260303-lcs-cid-sid-mid-pipeline
-- Generated: 2026-03-03
--
-- Execution:
--   psql $NEON_CONNECTION_STRING -f migrations/lcs/005_lcs_cid_sid_mid_rollback.sql
--
-- CAUTION: This will DROP all 3 new tables and their data.
--   Data in lcs.cid, lcs.sid_output, lcs.mid_sequence_state will be lost.
--   frame_registry columns will be removed (nullable, so no data loss on existing rows).
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- Section 1: Remove frame_registry ALTER columns
-- (reverse order of addition)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE lcs.frame_registry
    DROP CONSTRAINT IF EXISTS chk_frame_mid_max_attempts,
    DROP CONSTRAINT IF EXISTS chk_frame_mid_delay_hours,
    DROP CONSTRAINT IF EXISTS chk_frame_mid_sequence_type,
    DROP CONSTRAINT IF EXISTS chk_frame_cid_compilation_rule;

ALTER TABLE lcs.frame_registry
    DROP COLUMN IF EXISTS mid_max_attempts,
    DROP COLUMN IF EXISTS mid_delay_hours,
    DROP COLUMN IF EXISTS mid_sequence_type,
    DROP COLUMN IF EXISTS sid_template_id,
    DROP COLUMN IF EXISTS cid_compilation_rule;

-- ═══════════════════════════════════════════════════════════════
-- Section 2: Drop triggers and functions
-- ═══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_lcs_mid_sequence_state_no_delete ON lcs.mid_sequence_state;
DROP TRIGGER IF EXISTS trg_lcs_mid_sequence_state_no_update ON lcs.mid_sequence_state;
DROP FUNCTION IF EXISTS lcs.prevent_mid_sequence_state_mutation();

DROP TRIGGER IF EXISTS trg_lcs_sid_output_no_delete ON lcs.sid_output;
DROP TRIGGER IF EXISTS trg_lcs_sid_output_no_update ON lcs.sid_output;
DROP FUNCTION IF EXISTS lcs.prevent_sid_output_mutation();

DROP TRIGGER IF EXISTS trg_lcs_cid_no_delete ON lcs.cid;
DROP TRIGGER IF EXISTS trg_lcs_cid_no_update ON lcs.cid;
DROP FUNCTION IF EXISTS lcs.prevent_cid_mutation();
DROP TRIGGER IF EXISTS trg_lcs_cid_notify_sid_worker ON lcs.cid;
DROP FUNCTION IF EXISTS lcs.notify_sid_worker();

-- ═══════════════════════════════════════════════════════════════
-- Section 3: Drop tables (CASCADE drops indexes automatically)
-- ═══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS lcs.mid_sequence_state CASCADE;
DROP TABLE IF EXISTS lcs.sid_output CASCADE;
DROP TABLE IF EXISTS lcs.cid CASCADE;

COMMIT;
