-- ============================================================================
-- MIGRATION 012: CID MOVEMENT REGISTRY + MINTING FUNCTION
-- ============================================================================
-- Authority: HUB-CL-001
-- Doctrine: docs/doctrine/COMMUNICATION_ID.md
-- Purpose: Movement code registry, communication event table, and
--          cl.mint_communication_id() — the sole CID minting entry point.
-- Scope: CID infrastructure only. Does not modify LCS or identity tables.
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 1: MOVEMENT CODE REGISTRY
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cl.movement_code_registry (
  subhub       VARCHAR   NOT NULL,
  code         INTEGER   NOT NULL,
  description  TEXT      NOT NULL,
  active       BOOLEAN   NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_movement_code_registry PRIMARY KEY (subhub, code)
);

COMMENT ON TABLE cl.movement_code_registry IS 'Registry of movement codes per sub-hub. Additive only — codes cannot be removed or repurposed.';
COMMENT ON COLUMN cl.movement_code_registry.subhub IS 'Sub-hub namespace: PPL, DOL, BLOG, BIT, etc.';
COMMENT ON COLUMN cl.movement_code_registry.code IS 'Numeric movement code, scoped per sub-hub. Zero-padded to 2 digits in CID.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 2: COMMUNICATION EVENT TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cl.communication_event (
  communication_id  TEXT        NOT NULL,
  sovereign_id      TEXT        NOT NULL,
  outreach_id       TEXT        NOT NULL,
  subhub            VARCHAR     NOT NULL,
  code              INTEGER     NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed         BOOLEAN     NOT NULL DEFAULT FALSE,

  CONSTRAINT pk_communication_event PRIMARY KEY (communication_id),
  CONSTRAINT fk_comm_event_movement_code FOREIGN KEY (subhub, code)
    REFERENCES cl.movement_code_registry (subhub, code)
);

CREATE INDEX IF NOT EXISTS idx_comm_event_sovereign
  ON cl.communication_event (sovereign_id);

CREATE INDEX IF NOT EXISTS idx_comm_event_unprocessed
  ON cl.communication_event (created_at)
  WHERE processed = FALSE;

COMMENT ON TABLE cl.communication_event IS 'Append-only CID ledger. Every row is a minted Communication ID representing a lifecycle movement event.';
COMMENT ON COLUMN cl.communication_event.communication_id IS 'CID: {sovereign_id}-{outreach_id}-{subhub}-{code}. Immutable. Sole PK.';
COMMENT ON COLUMN cl.communication_event.processed IS 'TRUE once LCS has consumed this CID. Default FALSE.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 3: CID MINTING FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════
-- Sole entry point for CID creation. Fail-closed.
-- Subhubs call this function. LCS reads the output. Nothing else mints.

CREATE OR REPLACE FUNCTION cl.mint_communication_id(
  p_sovereign_id TEXT,
  p_outreach_id  TEXT,
  p_subhub       TEXT,
  p_code         INTEGER
)
RETURNS TEXT AS $$
DECLARE
  v_active   BOOLEAN;
  v_cid      TEXT;
BEGIN
  -- Step 1: Validate movement code exists and is active
  SELECT active
    INTO v_active
    FROM cl.movement_code_registry
   WHERE subhub = p_subhub
     AND code   = p_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MINT_FAILED: movement code (%, %) not found in registry', p_subhub, p_code;
  END IF;

  IF NOT v_active THEN
    RAISE EXCEPTION 'MINT_FAILED: movement code (%, %) is inactive', p_subhub, p_code;
  END IF;

  -- Step 2: Construct CID (4 segments, code zero-padded to 2 digits)
  v_cid := p_sovereign_id || '-' ||
           p_outreach_id  || '-' ||
           p_subhub       || '-' ||
           LPAD(p_code::TEXT, 2, '0');

  -- Step 3: Insert into communication_event
  INSERT INTO cl.communication_event (
    communication_id,
    sovereign_id,
    outreach_id,
    subhub,
    code
  ) VALUES (
    v_cid,
    p_sovereign_id,
    p_outreach_id,
    p_subhub,
    p_code
  );

  -- Step 4: Return the minted CID
  RETURN v_cid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cl.mint_communication_id(TEXT, TEXT, TEXT, INTEGER) IS 'Sole CID minting entry point. Validates movement code, constructs CID, inserts communication_event. Fail-closed.';

COMMIT;
