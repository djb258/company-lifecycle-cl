-- LCS MID Delivery Sequence State
-- Classification: SUPPORTING / STAGING (APPEND-ONLY)
-- Authority: HUB-CL-001, SUBHUB-CL-LCS, SH-LCS-PIPELINE
-- Version: 1.0.0
-- Migration: 005_lcs_cid_sid_mid.sql
--
-- Purpose: Tracks delivery sequencing, gate verdicts, adapter routing
--   decisions, and attempt lifecycle per message_run_id.
--   Downstream of SID, feeds into CET (lcs.event).
--
-- Rules:
--   NO UPDATE allowed (immutability trigger enforced)
--   NO DELETE allowed (immutability trigger enforced)
--   By-value references only (no FKs)
--   Each delivery attempt = new row (append-only pattern)
--   No JSONB columns (structured columns only)

CREATE TABLE lcs.mid_sequence_state (
    -- MID identity
    mid_id              UUID            NOT NULL    DEFAULT gen_random_uuid(),

    -- Delivery attempt identity
    message_run_id      TEXT            NOT NULL,

    -- Communication reference (by value, not FK)
    communication_id    TEXT            NOT NULL,

    -- Adapter routing
    adapter_type        TEXT            NOT NULL,
    channel             TEXT            NOT NULL,

    -- Sequencing
    sequence_position   INT             NOT NULL,
    attempt_number      INT             NOT NULL    DEFAULT 1,

    -- Gate verdict
    gate_verdict        TEXT            NOT NULL,
    gate_reason         TEXT,                        -- reason for FAIL or SKIP verdict

    -- Throttle state
    throttle_status     TEXT,

    -- Delivery lifecycle
    delivery_status     TEXT            NOT NULL    DEFAULT 'PENDING',

    -- Scheduling
    scheduled_at        TIMESTAMPTZ,
    attempted_at        TIMESTAMPTZ,

    -- Timestamp (immutable)
    created_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    -- Constraints
    CONSTRAINT pk_lcs_mid_sequence_state PRIMARY KEY (mid_id),
    CONSTRAINT chk_mid_channel CHECK (channel IN ('MG', 'HR', 'SH')),
    CONSTRAINT chk_mid_gate_verdict CHECK (gate_verdict IN ('PASS', 'FAIL', 'SKIP')),
    CONSTRAINT chk_mid_throttle_status CHECK (throttle_status IS NULL OR throttle_status IN (
        'CLEAR', 'THROTTLED_RECIPIENT', 'THROTTLED_COMPANY', 'THROTTLED_ADAPTER'
    )),
    CONSTRAINT chk_mid_delivery_status CHECK (delivery_status IN (
        'PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED'
    )),
    CONSTRAINT chk_mid_attempt_number CHECK (attempt_number BETWEEN 1 AND 10),
    CONSTRAINT chk_mid_comm_id_format CHECK (communication_id ~ '^LCS-(OUT|SAL|CLI)-\d{8}-[A-Z0-9]{10,}$'),
    CONSTRAINT chk_mid_run_id_format CHECK (message_run_id ~ '^RUN-LCS-(OUT|SAL|CLI)-\d{8}-[A-Z0-9]{10,}-(MG|HR|SH)-\d{3}$')
);

-- Immutability triggers
CREATE OR REPLACE FUNCTION lcs.prevent_mid_sequence_state_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'lcs.mid_sequence_state is append-only — UPDATE and DELETE are prohibited';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lcs_mid_sequence_state_no_update
    BEFORE UPDATE ON lcs.mid_sequence_state
    FOR EACH ROW
    EXECUTE FUNCTION lcs.prevent_mid_sequence_state_mutation();

CREATE TRIGGER trg_lcs_mid_sequence_state_no_delete
    BEFORE DELETE ON lcs.mid_sequence_state
    FOR EACH ROW
    EXECUTE FUNCTION lcs.prevent_mid_sequence_state_mutation();

-- Indexes
CREATE INDEX idx_lcs_mid_comm_id ON lcs.mid_sequence_state (communication_id);
CREATE INDEX idx_lcs_mid_run_id ON lcs.mid_sequence_state (message_run_id);
CREATE INDEX idx_lcs_mid_created ON lcs.mid_sequence_state (created_at);
CREATE INDEX idx_lcs_mid_delivery ON lcs.mid_sequence_state (delivery_status);
CREATE INDEX idx_lcs_mid_pending ON lcs.mid_sequence_state (created_at)
    WHERE delivery_status = 'PENDING';
CREATE INDEX idx_lcs_mid_adapter ON lcs.mid_sequence_state (adapter_type, channel);

-- Comments
COMMENT ON TABLE lcs.mid_sequence_state IS 'MID Delivery Sequence State — append-only record of delivery sequencing, gate verdicts, adapter routing, and attempt lifecycle. Each attempt = new row.';
COMMENT ON COLUMN lcs.mid_sequence_state.mid_id IS 'Unique MID sequence state identifier, auto-generated UUID.';
COMMENT ON COLUMN lcs.mid_sequence_state.message_run_id IS 'Delivery attempt ID. Format: RUN-LCS-{PHASE}-{YYYYMMDD}-{ULID}-{CHANNEL}-{ATTEMPT}. References CET by value.';
COMMENT ON COLUMN lcs.mid_sequence_state.communication_id IS 'References lcs.cid.communication_id by value (not FK).';
COMMENT ON COLUMN lcs.mid_sequence_state.gate_verdict IS 'Pre-delivery gate verdict: PASS (proceed), FAIL (blocked), SKIP (not applicable).';
COMMENT ON COLUMN lcs.mid_sequence_state.throttle_status IS 'Throttle state at routing time: CLEAR or THROTTLED_RECIPIENT/COMPANY/ADAPTER.';
