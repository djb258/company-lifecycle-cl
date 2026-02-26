-- ============================================================================
-- MIGRATION 013: LCS CID BACKBONE
-- ============================================================================
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Purpose:   Deterministic, versioned, append-only outreach cycle ledger.
--            Cycle Identity (CID) is the anchor for LCS execution cycles.
-- Scope:     One table, one generation trigger, one immutability trigger,
--            one current-revision view. Nothing else.
-- Doctrine:  docs/lcs/CID_BACKBONE.md
-- ============================================================================
-- CID is NOT a sub-hub.
-- CID is NOT stored in canonical identity.
-- CID is NOT signal logic or strategy logic.
-- CID = cycle anchor only.
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 1: ENUM — cycle_state
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE cl.cycle_state AS ENUM (
    'OPEN',       -- Cycle is active, accepting signals
    'EXECUTING',  -- Cycle is mid-execution
    'COMPLETED',  -- Cycle finished normally
    'FROZEN'      -- Cycle frozen, no further changes
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 2: TABLE — lcs_outreach_cycle
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cl.lcs_outreach_cycle (
  -- Identity anchors (logical FKs by value)
  sovereign_id          TEXT        NOT NULL,
  outreach_id           TEXT        NOT NULL,

  -- Cycle versioning
  cycle_version         VARCHAR(6)  NOT NULL,  -- e.g., '202602'
  revision              INT         NOT NULL DEFAULT 1,

  -- Deterministic CID — populated by trigger, never by caller
  cid                   VARCHAR     NOT NULL,

  -- Signal metadata
  cycle_signal_code     CHAR(3)     NOT NULL,
  cycle_signal_version  INT         NOT NULL DEFAULT 1,

  -- State
  cycle_state           cl.cycle_state NOT NULL DEFAULT 'OPEN',

  -- Optional payload
  signal_payload        JSONB,

  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  frozen_at             TIMESTAMPTZ,

  -- -----------------------------------------------------------------------
  -- Constraints
  -- -----------------------------------------------------------------------
  CONSTRAINT pk_lcs_outreach_cycle
    PRIMARY KEY (sovereign_id, outreach_id, cycle_version, revision),

  CONSTRAINT uq_lcs_outreach_cycle_cid
    UNIQUE (cid),

  CONSTRAINT chk_revision_minimum
    CHECK (revision >= 1),

  CONSTRAINT chk_cycle_signal_code_length
    CHECK (LENGTH(cycle_signal_code) = 3),

  CONSTRAINT chk_cycle_signal_version_positive
    CHECK (cycle_signal_version >= 1)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 3: INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_lcs_oc_sovereign
  ON cl.lcs_outreach_cycle (sovereign_id);

CREATE INDEX IF NOT EXISTS idx_lcs_oc_outreach
  ON cl.lcs_outreach_cycle (outreach_id);

CREATE INDEX IF NOT EXISTS idx_lcs_oc_cycle_version
  ON cl.lcs_outreach_cycle (cycle_version);

CREATE INDEX IF NOT EXISTS idx_lcs_oc_state
  ON cl.lcs_outreach_cycle (cycle_state)
  WHERE cycle_state IN ('OPEN', 'EXECUTING');

CREATE INDEX IF NOT EXISTS idx_lcs_oc_created
  ON cl.lcs_outreach_cycle (created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 4: TRIGGER — Deterministic CID generation (before insert)
-- ═══════════════════════════════════════════════════════════════════════════
-- CID format: {sovereign_id}-{cycle_version}-R{revision}
-- No randomness. No UUID. No manual input.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION cl.trg_generate_cid()
RETURNS TRIGGER AS $$
BEGIN
  NEW.cid := NEW.sovereign_id || '-' || NEW.cycle_version || '-R' || NEW.revision;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lcs_oc_generate_cid ON cl.lcs_outreach_cycle;

CREATE TRIGGER trg_lcs_oc_generate_cid
  BEFORE INSERT ON cl.lcs_outreach_cycle
  FOR EACH ROW
  EXECUTE FUNCTION cl.trg_generate_cid();

COMMENT ON FUNCTION cl.trg_generate_cid() IS 'Deterministic CID minting. Format: {sovereign_id}-{cycle_version}-R{revision}. No randomness, no UUID, no manual override.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 5: TRIGGER — Immutability enforcement (frozen row guard)
-- ═══════════════════════════════════════════════════════════════════════════
-- If frozen_at IS NOT NULL, the row is sealed. All changes require a new
-- revision row. No exceptions.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION cl.trg_block_frozen_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.frozen_at IS NOT NULL THEN
    RAISE EXCEPTION 'Frozen CID rows cannot be modified. Insert new revision instead. CID: %', OLD.cid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lcs_oc_block_frozen ON cl.lcs_outreach_cycle;

CREATE TRIGGER trg_lcs_oc_block_frozen
  BEFORE UPDATE ON cl.lcs_outreach_cycle
  FOR EACH ROW
  EXECUTE FUNCTION cl.trg_block_frozen_update();

COMMENT ON FUNCTION cl.trg_block_frozen_update() IS 'Immutability guard. Once frozen_at is set, the row is sealed. All modifications must be new revision inserts.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 6: VIEW — v_lcs_outreach_cycle_current
-- ═══════════════════════════════════════════════════════════════════════════
-- Returns the latest revision per (sovereign_id, outreach_id, cycle_version).
-- LCS reads from this view. Never query the table directly for current state.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW cl.v_lcs_outreach_cycle_current AS
SELECT
  oc.sovereign_id,
  oc.outreach_id,
  oc.cycle_version,
  oc.revision,
  oc.cid,
  oc.cycle_signal_code,
  oc.cycle_signal_version,
  oc.cycle_state,
  oc.signal_payload,
  oc.created_at,
  oc.frozen_at
FROM cl.lcs_outreach_cycle oc
INNER JOIN (
  SELECT
    sovereign_id,
    outreach_id,
    cycle_version,
    MAX(revision) AS max_revision
  FROM cl.lcs_outreach_cycle
  GROUP BY sovereign_id, outreach_id, cycle_version
) latest
  ON  oc.sovereign_id  = latest.sovereign_id
  AND oc.outreach_id   = latest.outreach_id
  AND oc.cycle_version  = latest.cycle_version
  AND oc.revision       = latest.max_revision;

COMMENT ON VIEW cl.v_lcs_outreach_cycle_current IS 'Current revision per cycle. LCS reads this view for active cycle state. Never query the base table for current state.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 7: TABLE + VIEW COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE cl.lcs_outreach_cycle IS 'Append-only outreach cycle ledger. Each row is a versioned cycle identity (CID). Frozen rows are immutable. All changes require new revision inserts.';
COMMENT ON COLUMN cl.lcs_outreach_cycle.sovereign_id IS 'Logical FK to canonical company identity. Not enforced at DB level — validated by callers.';
COMMENT ON COLUMN cl.lcs_outreach_cycle.outreach_id IS 'Logical FK to outreach lifecycle record. Not enforced at DB level — validated by callers.';
COMMENT ON COLUMN cl.lcs_outreach_cycle.cycle_version IS 'Cycle period identifier, e.g., 202602 for February 2026. VARCHAR(6) — YYYYMM format.';
COMMENT ON COLUMN cl.lcs_outreach_cycle.revision IS 'Revision counter within a cycle. Starts at 1. Incremented on each new revision insert.';
COMMENT ON COLUMN cl.lcs_outreach_cycle.cid IS 'Deterministic Cycle Identity: {sovereign_id}-{cycle_version}-R{revision}. Generated by trigger. Never manually set.';
COMMENT ON COLUMN cl.lcs_outreach_cycle.cycle_signal_code IS '3-character signal code identifying the cycle trigger type.';
COMMENT ON COLUMN cl.lcs_outreach_cycle.cycle_signal_version IS 'Version of the signal code schema. Starts at 1.';
COMMENT ON COLUMN cl.lcs_outreach_cycle.cycle_state IS 'Current state: OPEN → EXECUTING → COMPLETED or FROZEN.';
COMMENT ON COLUMN cl.lcs_outreach_cycle.signal_payload IS 'Optional JSONB payload carrying signal-specific context. Not indexed, not queried — informational only.';
COMMENT ON COLUMN cl.lcs_outreach_cycle.created_at IS 'Row creation timestamp. Immutable after insert.';
COMMENT ON COLUMN cl.lcs_outreach_cycle.frozen_at IS 'Timestamp when this row was frozen. NULL = mutable. NOT NULL = sealed.';

COMMIT;
