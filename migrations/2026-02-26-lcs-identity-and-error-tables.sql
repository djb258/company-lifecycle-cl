-- ═══════════════════════════════════════════════════════════════════════════════
-- LCS Structure Lock — Identity + Message Ledger + Error + Sender Profiles
-- ═══════════════════════════════════════════════════════════════════════════════
-- Authority: imo-creator (Inherited)
-- Doctrine: ARCHITECTURE.md OWN-10a/10b, Part V (IMO Flow Law)
-- Lock: LCS ALTITUDE LOCK — womb-to-tomb message ledger (CTB COMPLIANT)
-- Pattern: 1 CANONICAL (message_ledger) + 1 ERROR (message_error) + 1 SUPPORTING
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add lcs_id to CL spine — write-once FK pointer, same pattern as
--    outreach_id, sales_process_id, client_id
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE cl.company_identity
    ADD COLUMN IF NOT EXISTS lcs_id UUID,
    ADD COLUMN IF NOT EXISTS lcs_attached_at TIMESTAMPTZ;

COMMENT ON COLUMN cl.company_identity.lcs_id IS 'Write-once pointer to LCS record, set when company enters lifecycle communication system';
COMMENT ON COLUMN cl.company_identity.lcs_attached_at IS 'Timestamp when lcs_id was attached, auto-set on first write';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. sender_profile_registry — SUPPORTING: sender configs per stage/channel
--    Must exist before message_ledger (FK dependency)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lcs.sender_profile_registry (
    sender_profile_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage               TEXT NOT NULL CHECK (stage IN ('OUTREACH', 'SALES', 'CLIENT')),
    channel             TEXT NOT NULL CHECK (channel IN ('EMAIL', 'LINKEDIN')),
    provider            TEXT NOT NULL CHECK (provider IN ('MAILGUN', 'HEYREACH', 'SMTP')),
    from_address        TEXT,
    reply_to_address    TEXT,
    display_name        TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE lcs.sender_profile_registry IS 'SUPPORTING — sender identity configs per stage/persona/channel for transport adapters';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. message_ledger — CANONICAL: womb-to-tomb message ledger (MID)
--    One record per send attempt, source of truth for everything ever sent
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lcs.message_ledger (
    mid                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sovereign_id        UUID NOT NULL,
    lcs_id              UUID NOT NULL,
    source_stage        TEXT NOT NULL CHECK (source_stage IN ('OUTREACH', 'SALES', 'CLIENT')),
    source_cid_table    TEXT NOT NULL,
    cid                 TEXT NOT NULL,
    channel             TEXT NOT NULL CHECK (channel IN ('EMAIL', 'LINKEDIN')),
    provider            TEXT NOT NULL CHECK (provider IN ('MAILGUN', 'HEYREACH', 'SMTP')),
    sender_profile_id   UUID NOT NULL REFERENCES lcs.sender_profile_registry(sender_profile_id),
    payload_hash        TEXT NOT NULL,
    status              TEXT NOT NULL CHECK (status IN ('READY', 'SENT', 'FAIL', 'SUPPRESSED', 'RETRY')),
    provider_message_id TEXT,
    attempt_number      INTEGER NOT NULL DEFAULT 1,
    ready_at            TIMESTAMPTZ,
    sent_at             TIMESTAMPTZ,
    last_error_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE lcs.message_ledger IS 'CTB CANONICAL — womb-to-tomb message ledger, one MID per send attempt, all stages';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. message_error — ERROR: fail-closed logging for routing/output failures
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lcs.message_error (
    error_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sovereign_id    UUID NOT NULL,
    lcs_id          UUID,
    source_stage    TEXT NOT NULL,
    cid             TEXT,
    error_code      TEXT NOT NULL,
    payload         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE lcs.message_error IS 'CTB ERROR — fail-closed logging for invalid CID-to-MID creation or output failures';
