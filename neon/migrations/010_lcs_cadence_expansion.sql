-- ============================================================================
-- MIGRATION 010: LCS CADENCE EXPANSION (PHASE 2)
-- ============================================================================
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Purpose: Add scheduled_for to ledger, update cl.lcs_attempt_send() to
--          expand cadence registry into N scheduled ledger rows per signal.
-- Scope: Cadence expansion only. No adapters, no AI, no identity changes.
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 1: ADD scheduled_for TO CANONICAL LEDGER
-- ═══════════════════════════════════════════════════════════════════════════

-- Step A: Add nullable column
ALTER TABLE cl.lcs_communication_ledger
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

-- Step B: Backfill existing rows (Phase 1 rows have no scheduling — use created_at)
UPDATE cl.lcs_communication_ledger
   SET scheduled_for = created_at
 WHERE scheduled_for IS NULL;

-- Step C: Enforce NOT NULL going forward
ALTER TABLE cl.lcs_communication_ledger
  ALTER COLUMN scheduled_for SET NOT NULL;

-- Step D: Index for adapter polling (future): APPROVED rows due now
CREATE INDEX IF NOT EXISTS idx_lcs_ledger_scheduled
  ON cl.lcs_communication_ledger (scheduled_for)
  WHERE status = 'APPROVED';

-- Step E: Update message_id comment to reflect new format
COMMENT ON COLUMN cl.lcs_communication_ledger.message_id IS 'Deterministic: communication_id__signal_id__step_number';
COMMENT ON COLUMN cl.lcs_communication_ledger.scheduled_for IS 'Earliest eligible send time. Adapters act when status=APPROVED AND scheduled_for <= now().';
COMMENT ON COLUMN cl.lcs_communication_ledger.cadence_instance_id IS 'Groups all ledger rows expanded from a single signal into one cadence instance.';
COMMENT ON COLUMN cl.lcs_communication_ledger.step_number IS 'Step position within cadence (1-indexed). NULL only for Phase 1 legacy rows.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 2: REPLACE STORED PROCEDURE — cl.lcs_attempt_send()
-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 2: After all validations pass, expand cadence into N ledger rows.
-- Fail-closed. Every path either returns a decision or writes an error.

CREATE OR REPLACE FUNCTION cl.lcs_attempt_send(p_signal_id UUID)
RETURNS JSON AS $$
DECLARE
  v_signal            RECORD;
  v_company           RECORD;
  v_comm_reg          RECORD;
  v_cadence           RECORD;
  v_lifecycle         cl.lifecycle_stage;
  v_suppressed        BOOLEAN;
  v_recent_count      INT;
  v_cadence_instance  UUID;
  v_offsets           INT[];
  v_step              INT;
  v_message_id        TEXT;
  v_ledger_id         UUID;
  v_ledger_ids        UUID[] := '{}';
  v_message_ids       TEXT[] := '{}';
BEGIN

  -- -----------------------------------------------------------------------
  -- Step 1: Lock signal row FOR UPDATE; reject if not QUEUED
  -- -----------------------------------------------------------------------
  SELECT *
    INTO v_signal
    FROM cl.lcs_signal_queue
   WHERE signal_id = p_signal_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'decision', 'ERROR',
      'ledger_id', NULL,
      'message_id', NULL,
      'reason', 'SIGNAL_NOT_FOUND'
    );
  END IF;

  IF v_signal.status != 'QUEUED' THEN
    RETURN json_build_object(
      'decision', 'BLOCKED',
      'ledger_id', NULL,
      'message_id', NULL,
      'reason', 'SIGNAL_NOT_QUEUED: status=' || v_signal.status::TEXT
    );
  END IF;

  -- -----------------------------------------------------------------------
  -- Step 2: Lookup company + derive lifecycle_stage from pointers
  -- -----------------------------------------------------------------------
  SELECT company_unique_id,
         company_name,
         CASE
           WHEN client_id IS NOT NULL THEN 'CLIENT'::cl.lifecycle_stage
           WHEN sales_process_id IS NOT NULL THEN 'SALES'::cl.lifecycle_stage
           WHEN outreach_id IS NOT NULL THEN 'OUTREACH'::cl.lifecycle_stage
           ELSE 'INVENTORY'::cl.lifecycle_stage
         END AS lifecycle_stage
    INTO v_company
    FROM cl.company_identity
   WHERE company_unique_id = v_signal.sovereign_company_id;

  -- -----------------------------------------------------------------------
  -- Step 3: Company not found → error + mark signal ERROR
  -- -----------------------------------------------------------------------
  IF NOT FOUND THEN
    INSERT INTO cl.lcs_errors (sovereign_company_id, source_signal_id, error_code, error_detail)
    VALUES (
      v_signal.sovereign_company_id,
      p_signal_id,
      'COMPANY_NOT_FOUND',
      json_build_object('sovereign_company_id', v_signal.sovereign_company_id)::JSONB
    );

    UPDATE cl.lcs_signal_queue
       SET status = 'ERROR',
           processed_at = NOW()
     WHERE signal_id = p_signal_id;

    RETURN json_build_object(
      'decision', 'ERROR',
      'ledger_id', NULL,
      'message_id', NULL,
      'reason', 'COMPANY_NOT_FOUND'
    );
  END IF;

  v_lifecycle := v_company.lifecycle_stage;

  -- -----------------------------------------------------------------------
  -- Step 4: Validate proposed_communication_id in registry
  -- -----------------------------------------------------------------------
  SELECT *
    INTO v_comm_reg
    FROM cl.lcs_communication_registry
   WHERE communication_id = v_signal.proposed_communication_id;

  IF NOT FOUND THEN
    INSERT INTO cl.lcs_errors (sovereign_company_id, source_signal_id, error_code, error_detail)
    VALUES (
      v_signal.sovereign_company_id,
      p_signal_id,
      'COMMUNICATION_NOT_REGISTERED',
      json_build_object('proposed_communication_id', v_signal.proposed_communication_id)::JSONB
    );

    UPDATE cl.lcs_signal_queue
       SET status = 'ERROR',
           processed_at = NOW()
     WHERE signal_id = p_signal_id;

    RETURN json_build_object(
      'decision', 'ERROR',
      'ledger_id', NULL,
      'message_id', NULL,
      'reason', 'COMMUNICATION_NOT_REGISTERED'
    );
  END IF;

  -- Must be active
  IF NOT v_comm_reg.active_flag THEN
    UPDATE cl.lcs_signal_queue
       SET status = 'REJECTED',
           processed_at = NOW()
     WHERE signal_id = p_signal_id;

    RETURN json_build_object(
      'decision', 'BLOCKED',
      'ledger_id', NULL,
      'message_id', NULL,
      'reason', 'COMMUNICATION_INACTIVE'
    );
  END IF;

  -- Class must match
  IF v_comm_reg.communication_class != v_signal.communication_class THEN
    UPDATE cl.lcs_signal_queue
       SET status = 'REJECTED',
           processed_at = NOW()
     WHERE signal_id = p_signal_id;

    RETURN json_build_object(
      'decision', 'BLOCKED',
      'ledger_id', NULL,
      'message_id', NULL,
      'reason', 'CLASS_MISMATCH: signal=' || v_signal.communication_class::TEXT
                || ' registry=' || v_comm_reg.communication_class::TEXT
    );
  END IF;

  -- Lifecycle stage must be in allowed_stages
  IF NOT (v_lifecycle = ANY(v_comm_reg.allowed_stages)) THEN
    UPDATE cl.lcs_signal_queue
       SET status = 'REJECTED',
           processed_at = NOW()
     WHERE signal_id = p_signal_id;

    RETURN json_build_object(
      'decision', 'BLOCKED',
      'ledger_id', NULL,
      'message_id', NULL,
      'reason', 'STAGE_NOT_ALLOWED: company_stage=' || v_lifecycle::TEXT
    );
  END IF;

  -- -----------------------------------------------------------------------
  -- Step 5: Suppression check
  -- -----------------------------------------------------------------------
  SELECT suppressed_flag
    INTO v_suppressed
    FROM cl.lcs_suppression_registry
   WHERE sovereign_company_id = v_signal.sovereign_company_id
     AND suppressed_flag = TRUE;

  IF FOUND AND v_suppressed THEN
    UPDATE cl.lcs_signal_queue
       SET status = 'REJECTED',
           processed_at = NOW()
     WHERE signal_id = p_signal_id;

    RETURN json_build_object(
      'decision', 'BLOCKED',
      'ledger_id', NULL,
      'message_id', NULL,
      'reason', 'SUPPRESSED'
    );
  END IF;

  -- -----------------------------------------------------------------------
  -- Step 6: 7-day one-active guard (same communication_class)
  -- -----------------------------------------------------------------------
  SELECT COUNT(*)
    INTO v_recent_count
    FROM cl.lcs_communication_ledger
   WHERE sovereign_company_id = v_signal.sovereign_company_id
     AND communication_class = v_signal.communication_class
     AND status IN ('APPROVED', 'SENT')
     AND created_at >= NOW() - INTERVAL '7 days';

  IF v_recent_count > 0 THEN
    UPDATE cl.lcs_signal_queue
       SET status = 'REJECTED',
           processed_at = NOW()
     WHERE signal_id = p_signal_id;

    RETURN json_build_object(
      'decision', 'BLOCKED',
      'ledger_id', NULL,
      'message_id', NULL,
      'reason', '7_DAY_GUARD: existing_count=' || v_recent_count
    );
  END IF;

  -- -----------------------------------------------------------------------
  -- Step 7: Resolve cadence (Phase 2)
  -- -----------------------------------------------------------------------
  SELECT *
    INTO v_cadence
    FROM cl.lcs_cadence_registry
   WHERE communication_id = v_signal.proposed_communication_id
     AND active_flag = TRUE
   LIMIT 1;

  IF FOUND THEN
    v_offsets := v_cadence.step_offsets_days;
  ELSE
    -- No cadence defined: default single-step immediate
    v_offsets := ARRAY[0];
  END IF;

  v_cadence_instance := gen_random_uuid();

  -- -----------------------------------------------------------------------
  -- Step 8: Expand cadence into N ledger rows
  -- -----------------------------------------------------------------------
  FOR v_step IN 1 .. array_length(v_offsets, 1) LOOP
    v_message_id := v_signal.proposed_communication_id
                    || '__' || p_signal_id::TEXT
                    || '__' || v_step::TEXT;

    INSERT INTO cl.lcs_communication_ledger (
      sovereign_company_id,
      lifecycle_stage,
      communication_class,
      communication_id,
      message_id,
      channel_type,
      source_hub,
      source_hub_id,
      cadence_instance_id,
      step_number,
      scheduled_for,
      status
    ) VALUES (
      v_signal.sovereign_company_id,
      v_lifecycle,
      v_signal.communication_class,
      v_signal.proposed_communication_id,
      v_message_id,
      'EMAIL',
      v_signal.source_hub,
      v_signal.source_hub_id,
      v_cadence_instance,
      v_step,
      NOW() + (v_offsets[v_step] * INTERVAL '1 day'),
      'APPROVED'
    )
    RETURNING ledger_id INTO v_ledger_id;

    v_ledger_ids  := array_append(v_ledger_ids, v_ledger_id);
    v_message_ids := array_append(v_message_ids, v_message_id);
  END LOOP;

  -- -----------------------------------------------------------------------
  -- Step 9: Mark signal PROCESSED
  -- -----------------------------------------------------------------------
  UPDATE cl.lcs_signal_queue
     SET status = 'PROCESSED',
         processed_at = NOW()
   WHERE signal_id = p_signal_id;

  -- -----------------------------------------------------------------------
  -- Step 10: Return success
  -- -----------------------------------------------------------------------
  RETURN json_build_object(
    'decision', 'APPROVED',
    'cadence_instance_id', v_cadence_instance,
    'ledger_ids', to_json(v_ledger_ids),
    'message_ids', to_json(v_message_ids),
    'reason', 'cadence_expanded: steps=' || array_length(v_offsets, 1)
              || ' stage=' || v_lifecycle::TEXT
  );

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cl.lcs_attempt_send(UUID) IS 'Fail-closed signal processor. Validates signal, checks suppression + 7-day guard, expands cadence into N scheduled ledger rows. Returns JSON with decision + ledger_ids + message_ids.';

COMMIT;
