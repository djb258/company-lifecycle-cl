-- LCS SID Message Construction Output
-- Classification: SUPPORTING / STAGING (APPEND-ONLY)
-- Authority: HUB-CL-001, SUBHUB-CL-LCS, SH-LCS-PIPELINE
-- Version: 1.0.0
-- Migration: 005_lcs_cid_sid_mid.sql
--
-- Purpose: Captures constructed message content, template resolution,
--   and recipient details per communication.
--   Downstream of CID, upstream of MID.
--
-- Rules:
--   NO UPDATE allowed (immutability trigger enforced)
--   NO DELETE allowed (immutability trigger enforced)
--   By-value references only (no FKs)
--   No JSONB columns (structured columns only)

CREATE TABLE lcs.sid_output (
    -- SID identity
    sid_id              UUID            NOT NULL    DEFAULT gen_random_uuid(),

    -- Communication reference (by value, not FK)
    communication_id    TEXT            NOT NULL,

    -- Frame and template
    frame_id            TEXT            NOT NULL,
    template_id         TEXT,                        -- resolved template identifier

    -- Constructed message content
    subject_line        TEXT,
    body_plain          TEXT,
    body_html           TEXT,

    -- Sender resolution
    sender_identity     TEXT,                        -- sender persona
    sender_email        TEXT,                        -- resolved from-address

    -- Recipient resolution
    recipient_email     TEXT,
    recipient_name      TEXT,

    -- Construction state
    construction_status TEXT            NOT NULL,
    construction_reason TEXT,                        -- reason for FAILED or BLOCKED status

    -- Timestamp (immutable)
    created_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    -- Constraints
    CONSTRAINT pk_lcs_sid_output PRIMARY KEY (sid_id),
    CONSTRAINT chk_sid_construction_status CHECK (construction_status IN ('CONSTRUCTED', 'FAILED', 'BLOCKED')),
    CONSTRAINT chk_sid_comm_id_format CHECK (communication_id ~ '^LCS-(OUT|SAL|CLI)-\d{8}-[A-Z0-9]{10,}$')
);

-- Immutability triggers
CREATE OR REPLACE FUNCTION lcs.prevent_sid_output_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'lcs.sid_output is append-only — UPDATE and DELETE are prohibited';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lcs_sid_output_no_update
    BEFORE UPDATE ON lcs.sid_output
    FOR EACH ROW
    EXECUTE FUNCTION lcs.prevent_sid_output_mutation();

CREATE TRIGGER trg_lcs_sid_output_no_delete
    BEFORE DELETE ON lcs.sid_output
    FOR EACH ROW
    EXECUTE FUNCTION lcs.prevent_sid_output_mutation();

-- Indexes
CREATE INDEX idx_lcs_sid_comm_id ON lcs.sid_output (communication_id);
CREATE INDEX idx_lcs_sid_created ON lcs.sid_output (created_at);
CREATE INDEX idx_lcs_sid_status ON lcs.sid_output (construction_status);
CREATE INDEX idx_lcs_sid_constructed ON lcs.sid_output (created_at)
    WHERE construction_status = 'CONSTRUCTED';

-- Comments
COMMENT ON TABLE lcs.sid_output IS 'SID Message Construction Output — append-only record of message construction per communication. Captures template resolution, content, and recipient details.';
COMMENT ON COLUMN lcs.sid_output.sid_id IS 'Unique SID output identifier, auto-generated UUID.';
COMMENT ON COLUMN lcs.sid_output.communication_id IS 'References lcs.cid.communication_id by value (not FK).';
COMMENT ON COLUMN lcs.sid_output.template_id IS 'Resolved template identifier used for message construction.';
COMMENT ON COLUMN lcs.sid_output.construction_status IS 'Construction outcome: CONSTRUCTED (success), FAILED (template/data issue), BLOCKED (gate).';
