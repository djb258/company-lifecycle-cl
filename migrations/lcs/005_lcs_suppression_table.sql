-- ============================================================================
-- MIGRATION 005: LCS SUPPRESSION TABLE
-- ============================================================================
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Purpose:   Suppression registry for bounce, complaint, unsubscribe, and
--            manual suppression events. Queried by the suppression gate in
--            the LCS pipeline runner.
-- Status:    TABLE ALREADY DEPLOYED TO NEON (2026-02-18 via CC_PROMPT_02).
--            This file is the authoritative migration record.
-- ============================================================================
-- NOTE: The deployed schema has 16 columns (expanded from the original 12-col
-- spec). This migration documents the deployed schema exactly as it exists.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS lcs.suppression (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT,
  entity_id             UUID,
  sovereign_company_id  UUID,
  suppression_state     TEXT        NOT NULL DEFAULT 'ACTIVE'
    CHECK (suppression_state IN ('ACTIVE', 'COOLED', 'PARKED', 'SUPPRESSED')),
  never_contact         BOOLEAN     NOT NULL DEFAULT false,
  unsubscribed          BOOLEAN     NOT NULL DEFAULT false,
  hard_bounced          BOOLEAN     NOT NULL DEFAULT false,
  complained            BOOLEAN     NOT NULL DEFAULT false,
  suppression_source    TEXT        NOT NULL,
  source_event_id       TEXT,
  channel               TEXT,
  domain                TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppression_email_source
  ON lcs.suppression (email, suppression_source);

CREATE INDEX IF NOT EXISTS idx_suppression_company
  ON lcs.suppression (sovereign_company_id);

CREATE INDEX IF NOT EXISTS idx_suppression_entity
  ON lcs.suppression (entity_id);

CREATE INDEX IF NOT EXISTS idx_suppression_state
  ON lcs.suppression (suppression_state);

CREATE INDEX IF NOT EXISTS idx_suppression_channel
  ON lcs.suppression (channel);

CREATE INDEX IF NOT EXISTS idx_suppression_expires
  ON lcs.suppression (expires_at)
  WHERE expires_at IS NOT NULL;

-- Comments
COMMENT ON TABLE lcs.suppression IS 'Suppression registry. Hard flags (never_contact, hard_bounced, complained, unsubscribed) are permanent. State machine: ACTIVE → COOLED → PARKED → SUPPRESSED.';
COMMENT ON COLUMN lcs.suppression.suppression_source IS 'Origin of suppression: MAILGUN_BOUNCE, MAILGUN_COMPLAINT, HEYREACH_REJECTED, MANUAL, NIGHTLY_SYNC.';
COMMENT ON COLUMN lcs.suppression.source_event_id IS 'Communication ID of the event that triggered this suppression.';

COMMIT;
