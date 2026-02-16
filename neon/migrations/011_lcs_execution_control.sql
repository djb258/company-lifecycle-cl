-- ============================================================================
-- MIGRATION 011: LCS EXECUTION CONTROL (PHASE 3)
-- ============================================================================
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Purpose: Add execution tracking columns to canonical ledger.
--          Prepares for adapter execution without integrating external APIs.
-- Scope: Columns only. No cadence changes. No adapter integration.
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 1: EXECUTION CONTROL COLUMNS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE cl.lcs_communication_ledger
  ADD COLUMN IF NOT EXISTS execution_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 2: ADAPTER POLLING INDEX
-- ═══════════════════════════════════════════════════════════════════════════
-- Note: idx_lcs_ledger_scheduled (migration 010) already covers
--   (scheduled_for) WHERE status = 'APPROVED'
-- which is the exact predicate adapters need. No new index required.

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 3: COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON COLUMN cl.lcs_communication_ledger.execution_attempts IS 'Number of delivery attempts. Incremented each time an adapter processes this row.';
COMMENT ON COLUMN cl.lcs_communication_ledger.last_attempt_at IS 'Timestamp of the most recent delivery attempt.';
COMMENT ON COLUMN cl.lcs_communication_ledger.sent_at IS 'Timestamp when delivery was confirmed (status transitioned to SENT).';

COMMIT;
