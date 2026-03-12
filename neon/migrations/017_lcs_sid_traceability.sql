-- ============================================================================
-- MIGRATION 017: LCS SID + TRACEABILITY LAYER
-- ============================================================================
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Purpose:   (1) Build SID (Signal-Initiated Delivery) table
--            (2) Add sid_id back-link to communication_ledger (MID)
--            (3) Build forward/reverse/company traceability views
--            (4) Register SID in CTB governance layer
-- BAR: BAR-51
-- Depends: 009_lcs_backbone.sql, 013_lcs_cid_backbone.sql
-- ============================================================================
-- The traceability chain:
--   outreach.signal_output (signal_id)
--   → lcs.signal_queue (bridge ingress — source_signal_id)
--   → cl.lcs_signal_queue (delivery queue — signal_id)
--   → cl.lcs_delivery_record (SID — links CID to MID)
--   → cl.lcs_communication_ledger (MID — ledger_id)
--
-- CID = cl.lcs_outreach_cycle (cycle anchor, already exists via migration 013)
-- SID = cl.lcs_delivery_record (NEW — this migration)
-- MID = cl.lcs_communication_ledger (already exists via migration 009)
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 1: ENUM — delivery_status
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE cl.delivery_status AS ENUM (
    'QUEUED',       -- SID created, awaiting delivery
    'SENT',         -- Handed to adapter
    'DELIVERED',    -- Confirmed delivery
    'FAILED',       -- Delivery failed
    'BOUNCED',      -- Hard/soft bounce
    'CANCELLED'     -- Cancelled before send
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 2: TABLE — lcs_delivery_record (SID)
-- ═══════════════════════════════════════════════════════════════════════════
-- SID is the delivery tracking layer. One SID per approved communication.
-- Links backward to CID (cycle) and forward to MID (ledger).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cl.lcs_delivery_record (
  -- Primary key
  sid_id                 UUID                   NOT NULL DEFAULT gen_random_uuid(),

  -- Back-link to CID (outreach cycle)
  cid                    VARCHAR,               -- References cl.lcs_outreach_cycle.cid (logical FK)

  -- Back-link to signal queue
  signal_queue_id        UUID,                  -- References cl.lcs_signal_queue.signal_id (logical FK)

  -- Company anchor
  sovereign_company_id   UUID                   NOT NULL,

  -- Delivery details
  delivery_channel       cl.channel_type        NOT NULL DEFAULT 'EMAIL',
  communication_id       TEXT                   NOT NULL,  -- References communication_registry
  message_id             TEXT,                  -- Deterministic: communication_id__signal_id

  -- State
  status                 cl.delivery_status     NOT NULL DEFAULT 'QUEUED',

  -- Timestamps
  created_at             TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  sent_at                TIMESTAMPTZ,
  delivered_at           TIMESTAMPTZ,
  failed_at              TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT pk_lcs_delivery_record PRIMARY KEY (sid_id),
  CONSTRAINT uq_lcs_delivery_message UNIQUE (message_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lcs_dr_company
  ON cl.lcs_delivery_record (sovereign_company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lcs_dr_cid
  ON cl.lcs_delivery_record (cid)
  WHERE cid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lcs_dr_signal
  ON cl.lcs_delivery_record (signal_queue_id)
  WHERE signal_queue_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lcs_dr_status
  ON cl.lcs_delivery_record (status)
  WHERE status IN ('QUEUED', 'SENT');

COMMENT ON TABLE cl.lcs_delivery_record IS 'SID (Signal-Initiated Delivery). Tracks delivery lifecycle from CID approval through adapter execution. One row per delivery attempt.';
COMMENT ON COLUMN cl.lcs_delivery_record.sid_id IS 'Primary key. UUID auto-generated.';
COMMENT ON COLUMN cl.lcs_delivery_record.cid IS 'Logical FK to cl.lcs_outreach_cycle.cid. Links delivery to the originating cycle.';
COMMENT ON COLUMN cl.lcs_delivery_record.signal_queue_id IS 'Logical FK to cl.lcs_signal_queue.signal_id. Links to the signal that initiated this delivery.';
COMMENT ON COLUMN cl.lcs_delivery_record.sovereign_company_id IS 'Logical FK to cl.company_identity.company_unique_id.';
COMMENT ON COLUMN cl.lcs_delivery_record.message_id IS 'Deterministic message identifier. Matches cl.lcs_communication_ledger.message_id for MID linkage.';
COMMENT ON COLUMN cl.lcs_delivery_record.status IS 'Delivery lifecycle: QUEUED → SENT → DELIVERED (or FAILED/BOUNCED/CANCELLED).';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 3: ALTER — Add sid_id back-link to communication_ledger (MID)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE cl.lcs_communication_ledger
  ADD COLUMN IF NOT EXISTS sid_id UUID;

CREATE INDEX IF NOT EXISTS idx_lcs_ledger_sid
  ON cl.lcs_communication_ledger (sid_id)
  WHERE sid_id IS NOT NULL;

COMMENT ON COLUMN cl.lcs_communication_ledger.sid_id IS 'Logical FK to cl.lcs_delivery_record.sid_id. Back-links MID to SID for traceability.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 4: VIEW — Forward traceability (signal → CID → SID → MID)
-- ═══════════════════════════════════════════════════════════════════════════
-- Trace a signal forward through the entire pipeline.
-- Starts from cl.lcs_signal_queue (delivery queue), joins through SID to MID.
-- CID joined via sovereign_company_id + cycle_version context.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW cl.v_lcs_trace_forward AS
SELECT
  sq.signal_id,
  sq.source_hub,
  sq.sovereign_company_id,
  sq.proposed_communication_id,
  sq.status           AS signal_status,
  sq.created_at       AS signal_created_at,

  -- SID layer
  dr.sid_id,
  dr.cid              AS sid_cid_ref,
  dr.delivery_channel,
  dr.status           AS delivery_status,
  dr.sent_at,
  dr.delivered_at,

  -- CID layer (latest revision for this company)
  oc.cid,
  oc.cycle_version,
  oc.cycle_state,

  -- MID layer
  led.ledger_id       AS mid_ledger_id,
  led.communication_id AS mid_communication_id,
  led.message_id      AS mid_message_id,
  led.status          AS mid_status,
  led.created_at      AS mid_created_at

FROM cl.lcs_signal_queue sq

LEFT JOIN cl.lcs_delivery_record dr
  ON dr.signal_queue_id = sq.signal_id

LEFT JOIN cl.v_lcs_outreach_cycle_current oc
  ON oc.sovereign_id = sq.sovereign_company_id::TEXT

LEFT JOIN cl.lcs_communication_ledger led
  ON led.sid_id = dr.sid_id;

COMMENT ON VIEW cl.v_lcs_trace_forward IS 'Forward traceability: signal_queue → SID → CID → MID. Follows a signal through the full pipeline to delivery.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 5: VIEW — Reverse traceability (MID → SID → CID → signal)
-- ═══════════════════════════════════════════════════════════════════════════
-- Given a ledger row (MID), trace backward to the originating signal.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW cl.v_lcs_trace_reverse AS
SELECT
  -- MID layer
  led.ledger_id       AS mid_ledger_id,
  led.communication_id AS mid_communication_id,
  led.message_id      AS mid_message_id,
  led.status          AS mid_status,
  led.source_hub      AS mid_source_hub,
  led.created_at      AS mid_created_at,

  -- SID layer
  dr.sid_id,
  dr.delivery_channel,
  dr.status           AS delivery_status,
  dr.sent_at,
  dr.delivered_at,

  -- CID layer
  oc.cid,
  oc.cycle_version,
  oc.cycle_state,

  -- Signal layer
  sq.signal_id,
  sq.source_hub       AS signal_source_hub,
  sq.sovereign_company_id,
  sq.created_at       AS signal_created_at

FROM cl.lcs_communication_ledger led

LEFT JOIN cl.lcs_delivery_record dr
  ON led.sid_id = dr.sid_id

LEFT JOIN cl.lcs_signal_queue sq
  ON dr.signal_queue_id = sq.signal_id

LEFT JOIN cl.v_lcs_outreach_cycle_current oc
  ON oc.sovereign_id = led.sovereign_company_id::TEXT;

COMMENT ON VIEW cl.v_lcs_trace_reverse IS 'Reverse traceability: MID → SID → signal_queue → CID. Given a delivered message, trace back to the originating signal.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 6: VIEW — Company activity trace
-- ═══════════════════════════════════════════════════════════════════════════
-- All signal activity for a single company, with full trace chain.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW cl.v_lcs_company_activity AS
SELECT
  sq.sovereign_company_id,
  sq.signal_id,
  sq.source_hub,
  sq.proposed_communication_id,
  sq.status           AS signal_status,

  -- SID
  dr.sid_id,
  dr.delivery_channel,
  dr.status           AS delivery_status,

  -- CID
  oc.cid,
  oc.cycle_state,

  -- MID
  led.ledger_id       AS mid_ledger_id,
  led.message_id      AS mid_message_id,
  led.status          AS mid_status,

  -- Timeline
  sq.created_at       AS signal_at,
  dr.sent_at          AS sent_at,
  dr.delivered_at     AS delivered_at,
  led.created_at      AS ledger_at

FROM cl.lcs_signal_queue sq

LEFT JOIN cl.lcs_delivery_record dr
  ON dr.signal_queue_id = sq.signal_id

LEFT JOIN cl.v_lcs_outreach_cycle_current oc
  ON oc.sovereign_id = sq.sovereign_company_id::TEXT

LEFT JOIN cl.lcs_communication_ledger led
  ON led.sid_id = dr.sid_id

ORDER BY sq.created_at DESC;

COMMENT ON VIEW cl.v_lcs_company_activity IS 'Company activity trace. All signals for a company with full CID → SID → MID chain. Filter by sovereign_company_id.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 7: ERROR TABLE — lcs_delivery_errors
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cl.lcs_delivery_errors (
  error_id             UUID                   NOT NULL DEFAULT gen_random_uuid(),
  sid_id               UUID,                  -- Logical FK to lcs_delivery_record
  sovereign_company_id UUID,
  error_code           TEXT                   NOT NULL,
  error_detail         JSONB,
  created_at           TIMESTAMPTZ            NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_lcs_delivery_errors PRIMARY KEY (error_id)
);

CREATE INDEX IF NOT EXISTS idx_lcs_de_created
  ON cl.lcs_delivery_errors (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lcs_de_sid
  ON cl.lcs_delivery_errors (sid_id)
  WHERE sid_id IS NOT NULL;

COMMENT ON TABLE cl.lcs_delivery_errors IS 'SID delivery error log. Append-only. Captures adapter failures, bounce events, timeout errors.';
COMMENT ON COLUMN cl.lcs_delivery_errors.sid_id IS 'Logical FK to cl.lcs_delivery_record.sid_id. Links error to the delivery attempt.';
COMMENT ON COLUMN cl.lcs_delivery_errors.error_code IS 'Machine-readable: ADAPTER_TIMEOUT, BOUNCE_HARD, BOUNCE_SOFT, SEND_FAILED, etc.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 8: CTB REGISTRATION
-- ═══════════════════════════════════════════════════════════════════════════
-- Register SID and delivery errors in CTB governance layer.
-- Uses ctb_meta.table_registry (from migration 015/016).
-- ═══════════════════════════════════════════════════════════════════════════

-- Check if ctb_meta schema exists before registering
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'ctb_meta') THEN
    INSERT INTO ctb_meta.table_registry (table_schema, table_name, leaf_type, registered_by, notes)
    VALUES
      ('cl', 'lcs_delivery_record', 'CANONICAL', 'bar51_migration', 'SID table. Signal-Initiated Delivery tracking. Links CID to MID.'),
      ('cl', 'lcs_delivery_errors', 'ERROR', 'bar51_migration', 'SID delivery error log. Adapter failures, bounces, timeouts.')
    ON CONFLICT (table_schema, table_name) DO NOTHING;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 9: VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

-- Verify SID table exists
SELECT
  table_schema,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c
   WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'cl'
  AND table_name IN ('lcs_delivery_record', 'lcs_delivery_errors')
ORDER BY table_name;

-- Verify sid_id column added to communication_ledger
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'cl'
  AND table_name = 'lcs_communication_ledger'
  AND column_name = 'sid_id';

-- Verify views created
SELECT table_schema, table_name
FROM information_schema.views
WHERE table_schema = 'cl'
  AND table_name LIKE 'v_lcs_trace%'
   OR (table_schema = 'cl' AND table_name = 'v_lcs_company_activity')
ORDER BY table_name;

COMMIT;
