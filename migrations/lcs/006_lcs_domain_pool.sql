-- ============================================================================
-- MIGRATION 006: LCS DOMAIN POOL — Sending Domain Registry
-- ============================================================================
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Purpose:   Authoritative registry of all sending domains for Mailgun.
--            Pipeline reads from this. Humans and maintenance scripts write.
--            Domain selection is deterministic round-robin, not random.
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 1: TABLE — domain_pool
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lcs.domain_pool (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  domain                TEXT        NOT NULL UNIQUE,
  subdomain             TEXT        NOT NULL UNIQUE,
  sender_name           TEXT        NOT NULL,
  sender_email          TEXT        NOT NULL UNIQUE,
  status                TEXT        NOT NULL DEFAULT 'WARMING'
    CHECK (status IN ('WARMING', 'ACTIVE', 'PAUSED', 'DEAD')),
  warmup_day            INTEGER     NOT NULL DEFAULT 1,
  daily_cap             INTEGER     NOT NULL DEFAULT 20,
  sent_today            INTEGER     NOT NULL DEFAULT 0,
  bounce_rate_24h       NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
  complaint_rate_24h    NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
  last_sent_at          TIMESTAMPTZ,
  last_health_check_at  TIMESTAMPTZ,
  paused_at             TIMESTAMPTZ,
  pause_reason          TEXT,
  mailgun_verified      BOOLEAN     NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 2: INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_domain_pool_status
  ON lcs.domain_pool (status);

CREATE INDEX IF NOT EXISTS idx_domain_pool_sent_today
  ON lcs.domain_pool (sent_today, daily_cap);

CREATE INDEX IF NOT EXISTS idx_domain_pool_eligible
  ON lcs.domain_pool (sent_today ASC, last_sent_at ASC NULLS FIRST)
  WHERE status IN ('ACTIVE', 'WARMING') AND mailgun_verified = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 3: COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE lcs.domain_pool IS 'Authoritative registry of sending domains for Mailgun. Pipeline reads, humans write. Domain assignment locks per cadence.';
COMMENT ON COLUMN lcs.domain_pool.subdomain IS 'Mailgun sending subdomain, e.g., mail.domain1.com. This is what Mailgun routes from.';
COMMENT ON COLUMN lcs.domain_pool.sender_email IS 'Full sender address, e.g., dave@mail.domain1.com.';
COMMENT ON COLUMN lcs.domain_pool.status IS 'WARMING (new, ramping up), ACTIVE (full sends), PAUSED (temporarily stopped), DEAD (permanently retired).';
COMMENT ON COLUMN lcs.domain_pool.warmup_day IS 'Current warmup day count. Daily cap increases on a schedule.';
COMMENT ON COLUMN lcs.domain_pool.daily_cap IS 'Maximum sends per day for this domain. Starts low during warmup.';
COMMENT ON COLUMN lcs.domain_pool.sent_today IS 'Counter of sends today. Reset to 0 at midnight ET by lcs-domain-reset function.';
COMMENT ON COLUMN lcs.domain_pool.bounce_rate_24h IS 'Rolling 24h bounce rate. Domains exceeding 5% are skipped by rotation.';
COMMENT ON COLUMN lcs.domain_pool.complaint_rate_24h IS 'Rolling 24h complaint rate. Domains exceeding 0.1% are skipped by rotation.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 4: SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════
-- Slot 01: Verified Mailgun domain — Dave to update domain/subdomain/sender_email
-- Slots 02-10: Placeholder — mailgun_verified = false, will not be selected by rotation
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO lcs.domain_pool (domain, subdomain, sender_name, sender_email, status, daily_cap, mailgun_verified)
VALUES
  ('domain_slot_01', 'mail.domain_slot_01', 'Dave Barton', 'dave@mail.domain_slot_01', 'WARMING', 20, true),
  ('domain_slot_02', 'mail.domain_slot_02', 'Dave Barton', 'dave@mail.domain_slot_02', 'WARMING', 20, false),
  ('domain_slot_03', 'mail.domain_slot_03', 'Dave Barton', 'dave@mail.domain_slot_03', 'WARMING', 20, false),
  ('domain_slot_04', 'mail.domain_slot_04', 'Dave Barton', 'dave@mail.domain_slot_04', 'WARMING', 20, false),
  ('domain_slot_05', 'mail.domain_slot_05', 'Dave Barton', 'dave@mail.domain_slot_05', 'WARMING', 20, false),
  ('domain_slot_06', 'mail.domain_slot_06', 'Dave Barton', 'dave@mail.domain_slot_06', 'WARMING', 20, false),
  ('domain_slot_07', 'mail.domain_slot_07', 'Dave Barton', 'dave@mail.domain_slot_07', 'WARMING', 20, false),
  ('domain_slot_08', 'mail.domain_slot_08', 'Dave Barton', 'dave@mail.domain_slot_08', 'WARMING', 20, false),
  ('domain_slot_09', 'mail.domain_slot_09', 'Dave Barton', 'dave@mail.domain_slot_09', 'WARMING', 20, false),
  ('domain_slot_10', 'mail.domain_slot_10', 'Dave Barton', 'dave@mail.domain_slot_10', 'WARMING', 20, false)
ON CONFLICT (domain) DO NOTHING;

COMMIT;
