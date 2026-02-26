-- ============================================================================
-- MIGRATION 009: LCS BACKBONE (PHASE 1)
-- ============================================================================
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Purpose: Canonical ledger, error table, signal queue, 5 registries,
--          stored procedure cl.lcs_attempt_send().
-- Scope: Skeleton only. No adapter logic, no AI, no domain/identity work.
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 1: ENUMS
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE cl.lifecycle_stage AS ENUM ('INVENTORY', 'OUTREACH', 'SALES', 'CLIENT', 'DORMANT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cl.communication_class AS ENUM ('OUTREACH', 'SALES', 'CLIENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cl.channel_type AS ENUM ('EMAIL', 'LINKEDIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cl.signal_status AS ENUM ('QUEUED', 'PROCESSED', 'REJECTED', 'ERROR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cl.ledger_status AS ENUM ('APPROVED', 'BLOCKED', 'SENT', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 2A: CANONICAL LEDGER
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cl.lcs_communication_ledger (
  ledger_id              UUID                   NOT NULL DEFAULT gen_random_uuid(),
  sovereign_company_id   UUID                   NOT NULL,
  lifecycle_stage        cl.lifecycle_stage      NOT NULL,
  communication_class    cl.communication_class  NOT NULL,
  communication_id       TEXT                   NOT NULL,
  message_id             TEXT                   NOT NULL,
  channel_type           cl.channel_type         NOT NULL DEFAULT 'EMAIL',
  source_hub             TEXT                   NOT NULL,
  source_hub_id          TEXT,
  cadence_instance_id    UUID,
  step_number            INT,
  status                 cl.ledger_status        NOT NULL,
  created_at             TIMESTAMPTZ            NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_lcs_communication_ledger PRIMARY KEY (ledger_id),
  CONSTRAINT chk_ledger_source_hub CHECK (source_hub IN ('OUTREACH', 'SALES', 'CLIENT', 'SYSTEM'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lcs_ledger_company_created
  ON cl.lcs_communication_ledger (sovereign_company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lcs_ledger_class_created
  ON cl.lcs_communication_ledger (communication_class, created_at DESC);

-- Unique guardrail: one message_id per company+communication combo
CREATE UNIQUE INDEX IF NOT EXISTS idx_lcs_ledger_guardrail
  ON cl.lcs_communication_ledger (sovereign_company_id, communication_id, message_id);

COMMENT ON TABLE cl.lcs_communication_ledger IS 'LCS canonical communication ledger. Every APPROVED/SENT/BLOCKED/FAILED communication is recorded here.';
COMMENT ON COLUMN cl.lcs_communication_ledger.sovereign_company_id IS 'FK by value to cl.company_identity.company_unique_id';
COMMENT ON COLUMN cl.lcs_communication_ledger.communication_id IS 'References cl.lcs_communication_registry.communication_id';
COMMENT ON COLUMN cl.lcs_communication_ledger.message_id IS 'Deterministic: communication_id__signal_id';
COMMENT ON COLUMN cl.lcs_communication_ledger.source_hub IS 'Which hub originated: OUTREACH, SALES, CLIENT, or SYSTEM';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 2B: ERROR TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cl.lcs_errors (
  error_id               UUID                   NOT NULL DEFAULT gen_random_uuid(),
  sovereign_company_id   UUID,
  source_signal_id       UUID,
  error_code             TEXT                   NOT NULL,
  error_detail           JSONB,
  created_at             TIMESTAMPTZ            NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_lcs_errors PRIMARY KEY (error_id)
);

CREATE INDEX IF NOT EXISTS idx_lcs_errors_created
  ON cl.lcs_errors (created_at DESC);

COMMENT ON TABLE cl.lcs_errors IS 'LCS error log. Append-only. Captures proc failures, worker exceptions, validation errors.';
COMMENT ON COLUMN cl.lcs_errors.source_signal_id IS 'Signal that caused the error, if applicable';
COMMENT ON COLUMN cl.lcs_errors.error_code IS 'Machine-readable error code (e.g., COMPANY_NOT_FOUND, VALIDATION_FAILED)';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 2C: SIGNAL QUEUE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cl.lcs_signal_queue (
  signal_id                UUID                    NOT NULL DEFAULT gen_random_uuid(),
  sovereign_company_id     UUID                    NOT NULL,
  proposed_communication_id TEXT                   NOT NULL,
  communication_class      cl.communication_class  NOT NULL,
  diagnostic_codes         TEXT[]                  NOT NULL DEFAULT '{}',
  source_hub               TEXT                    NOT NULL,
  source_hub_id            TEXT,
  status                   cl.signal_status        NOT NULL DEFAULT 'QUEUED',
  created_at               TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  processed_at             TIMESTAMPTZ,

  CONSTRAINT pk_lcs_signal_queue PRIMARY KEY (signal_id),
  CONSTRAINT chk_sq_source_hub CHECK (source_hub IN ('OUTREACH', 'SALES', 'CLIENT', 'SYSTEM'))
);

-- Oldest-QUEUED-first index for worker polling
CREATE INDEX IF NOT EXISTS idx_lcs_sq_status_created
  ON cl.lcs_signal_queue (status, created_at);

-- Dedupe: one pending signal per source_hub_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_lcs_sq_dedupe
  ON cl.lcs_signal_queue (source_hub, source_hub_id)
  WHERE source_hub_id IS NOT NULL;

COMMENT ON TABLE cl.lcs_signal_queue IS 'LCS signal queue. Upstream hubs write QUEUED rows; worker drains via cl.lcs_attempt_send().';
COMMENT ON COLUMN cl.lcs_signal_queue.proposed_communication_id IS 'Which communication type this signal requests (references communication_registry)';
COMMENT ON COLUMN cl.lcs_signal_queue.diagnostic_codes IS 'Array of diagnostic codes attached to this signal';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 2D: COMMUNICATION REGISTRY
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cl.lcs_communication_registry (
  communication_id       TEXT                    NOT NULL,
  communication_class    cl.communication_class  NOT NULL,
  allowed_stages         cl.lifecycle_stage[]    NOT NULL,
  active_flag            BOOLEAN                 NOT NULL DEFAULT TRUE,

  CONSTRAINT pk_lcs_communication_registry PRIMARY KEY (communication_id)
);

COMMENT ON TABLE cl.lcs_communication_registry IS 'Registry of known communication types. Declare before use. Soft-delete via active_flag.';
COMMENT ON COLUMN cl.lcs_communication_registry.allowed_stages IS 'Which lifecycle stages this communication is valid for';

-- Seed rows (Phase 1)
INSERT INTO cl.lcs_communication_registry (communication_id, communication_class, allowed_stages) VALUES
  ('OUTREACH_BASELINE',          'OUTREACH', '{OUTREACH}'),
  ('OUTREACH_ESCALATION',        'OUTREACH', '{OUTREACH}'),
  ('SALES_FOLLOWUP',             'SALES',    '{SALES}'),
  ('CLIENT_EXECUTIVE_MONTHLY',   'CLIENT',   '{CLIENT}'),
  ('CLIENT_EMPLOYEE_NOTICE',     'CLIENT',   '{CLIENT}')
ON CONFLICT (communication_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 2E: DIAGNOSTIC CODE REGISTRY
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cl.lcs_diagnostic_code_registry (
  diagnostic_code        TEXT                    NOT NULL,
  active_flag            BOOLEAN                 NOT NULL DEFAULT TRUE,

  CONSTRAINT pk_lcs_diagnostic_code_registry PRIMARY KEY (diagnostic_code)
);

COMMENT ON TABLE cl.lcs_diagnostic_code_registry IS 'Registry of known diagnostic codes. Declare before use.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 2F: CADENCE REGISTRY
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cl.lcs_cadence_registry (
  cadence_id             TEXT                    NOT NULL,
  communication_id       TEXT                    NOT NULL,
  cadence_kind           TEXT                    NOT NULL,
  step_offsets_days      INT[]                   NOT NULL,
  active_flag            BOOLEAN                 NOT NULL DEFAULT TRUE,

  CONSTRAINT pk_lcs_cadence_registry PRIMARY KEY (cadence_id),
  CONSTRAINT fk_cadence_communication FOREIGN KEY (communication_id)
    REFERENCES cl.lcs_communication_registry (communication_id),
  CONSTRAINT chk_cadence_kind CHECK (cadence_kind IN ('BASELINE', 'EVENT'))
);

COMMENT ON TABLE cl.lcs_cadence_registry IS 'Cadence definitions. Each cadence references a communication type and defines step offsets.';
COMMENT ON COLUMN cl.lcs_cadence_registry.step_offsets_days IS 'Day offsets for each step, e.g., {0} or {0,5,12}';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 2G: ADAPTER REGISTRY
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cl.lcs_adapter_registry (
  adapter_id             TEXT                    NOT NULL,
  channel_type           cl.channel_type         NOT NULL,
  active_flag            BOOLEAN                 NOT NULL DEFAULT TRUE,

  CONSTRAINT pk_lcs_adapter_registry PRIMARY KEY (adapter_id)
);

COMMENT ON TABLE cl.lcs_adapter_registry IS 'Registry of delivery adapters. Phase 1: MAILGUN and HEYREACH stubs.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 2H: SUPPRESSION REGISTRY
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cl.lcs_suppression_registry (
  sovereign_company_id   UUID                    NOT NULL,
  suppressed_flag        BOOLEAN                 NOT NULL DEFAULT TRUE,
  reason                 TEXT,
  created_at             TIMESTAMPTZ             NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_lcs_suppression_registry PRIMARY KEY (sovereign_company_id)
);

COMMENT ON TABLE cl.lcs_suppression_registry IS 'Company-level suppression list. If suppressed_flag=true, lcs_attempt_send blocks all communications.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 3: STORED PROCEDURE — cl.lcs_attempt_send()
-- ═══════════════════════════════════════════════════════════════════════════
-- Fail-closed. Every path either returns a decision or writes an error.
-- No adapter logic — just ledger + queue state management.

CREATE OR REPLACE FUNCTION cl.lcs_attempt_send(p_signal_id UUID)
RETURNS JSON AS $$
DECLARE
  v_signal        RECORD;
  v_company       RECORD;
  v_comm_reg      RECORD;
  v_lifecycle     cl.lifecycle_stage;
  v_suppressed    BOOLEAN;
  v_recent_count  INT;
  v_message_id    TEXT;
  v_ledger_id     UUID;
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
  -- Step 7: Mint message_id (deterministic)
  -- -----------------------------------------------------------------------
  v_message_id := v_signal.proposed_communication_id || '__' || p_signal_id::TEXT;

  -- -----------------------------------------------------------------------
  -- Step 8: Insert ledger row (status=APPROVED)
  -- -----------------------------------------------------------------------
  INSERT INTO cl.lcs_communication_ledger (
    sovereign_company_id,
    lifecycle_stage,
    communication_class,
    communication_id,
    message_id,
    channel_type,
    source_hub,
    source_hub_id,
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
    'APPROVED'
  )
  RETURNING ledger_id INTO v_ledger_id;

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
    'ledger_id', v_ledger_id,
    'message_id', v_message_id,
    'reason', 'APPROVED: stage=' || v_lifecycle::TEXT
  );

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cl.lcs_attempt_send(UUID) IS 'Fail-closed signal processor. Validates signal, checks suppression + 7-day guard, mints ledger row. Returns JSON decision.';

COMMIT;
