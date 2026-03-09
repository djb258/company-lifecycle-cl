-- ═══════════════════════════════════════════════════════════════
-- LCS CID/SID/MID Pipeline Tables v1.0.0
-- Run AFTER: 001, 002, 003, 004 migrations
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Work Packet: wp-20260303-lcs-cid-sid-mid-pipeline
-- Generated: 2026-03-03
--
-- Contents:
--   Section 1: New tables (3) — cid, sid_output, mid_sequence_state
--   Section 2: Immutability triggers (3) — append-only enforcement
--   Section 3: SID trigger — notify worker on COMPILED CID inserts
--   Section 4: ALTER frame_registry — add CID/SID/MID integration columns
--   Section 5: Indexes
--   Section 6: Comments
--   Section 7: Grants
--
-- Execution:
--   psql $NEON_CONNECTION_STRING -f migrations/lcs/005_lcs_cid_sid_mid.sql
--
-- Rollback:
--   psql $NEON_CONNECTION_STRING -f migrations/lcs/005_lcs_cid_sid_mid_rollback.sql
--
-- Prerequisites:
--   lcs schema must exist (from migration 001)
--   lcs.frame_registry must exist (from migration 001)
--   lcs.signal_queue must exist (from migration 001)
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- Section 1: New Tables
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- lcs.cid — CID Compiler Registry
-- Classification: CANONICAL (APPEND-ONLY)
-- Sub-hub: SH-LCS-PIPELINE
--
-- Tracks all minted communication_ids with compilation state,
-- signal source, frame binding, and company reference.
-- This is the origin point of the CID → SID → MID → CET flow.
--
-- Rules:
--   NO UPDATE allowed
--   NO DELETE allowed
--   By-value references only (no FKs)
--   communication_id format matches CET format
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE lcs.cid (
    -- Communication identity (minted here, consumed by SID/MID/CET)
    communication_id    TEXT            NOT NULL,

    -- Sovereign identity reference (by value, not FK)
    sovereign_company_id UUID           NOT NULL,

    -- Entity target (resolved at compilation time)
    entity_type         TEXT            NOT NULL,
    entity_id           UUID            NOT NULL,

    -- Signal source (by value references)
    signal_set_hash     TEXT            NOT NULL,
    signal_queue_id     UUID,                       -- reference to lcs.signal_queue entry, nullable for manual mints

    -- Frame binding (by value reference)
    frame_id            TEXT            NOT NULL,

    -- Classification
    lifecycle_phase     TEXT            NOT NULL,
    lane                TEXT            NOT NULL,
    agent_number        TEXT            NOT NULL,

    -- Intelligence snapshot at compilation time
    intelligence_tier   INT,

    -- Compilation state
    compilation_status  TEXT            NOT NULL,
    compilation_reason  TEXT,                        -- reason for FAILED or BLOCKED status

    -- Timestamp (immutable)
    created_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    -- Constraints
    CONSTRAINT pk_lcs_cid PRIMARY KEY (communication_id),
    CONSTRAINT chk_cid_entity_type CHECK (entity_type IN ('slot', 'person')),
    CONSTRAINT chk_cid_lifecycle_phase CHECK (lifecycle_phase IN ('OUTREACH', 'SALES', 'CLIENT')),
    CONSTRAINT chk_cid_lane CHECK (lane IN ('MAIN', 'LANE_A', 'LANE_B', 'NEWSLETTER')),
    CONSTRAINT chk_cid_compilation_status CHECK (compilation_status IN ('COMPILED', 'FAILED', 'BLOCKED')),
    CONSTRAINT chk_cid_format CHECK (communication_id ~ '^LCS-(OUT|SAL|CLI)-\d{8}-[A-Z0-9]{10,}$'),
    CONSTRAINT chk_cid_tier CHECK (intelligence_tier IS NULL OR intelligence_tier BETWEEN 1 AND 5)
);

-- ═══════════════════════════════════════════════════════════════
-- lcs.sid_output — SID Message Construction Output
-- Classification: SUPPORTING / STAGING (APPEND-ONLY)
-- Sub-hub: SH-LCS-PIPELINE
--
-- Captures constructed message content, template resolution,
-- and recipient details per communication.
-- Downstream of CID, upstream of MID.
--
-- Rules:
--   NO UPDATE allowed
--   NO DELETE allowed
--   By-value references only (no FKs)
--   No JSONB columns (structured columns only)
-- ═══════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════
-- lcs.mid_sequence_state — MID Delivery Sequence State
-- Classification: SUPPORTING / STAGING (APPEND-ONLY)
-- Sub-hub: SH-LCS-PIPELINE
--
-- Tracks delivery sequencing, gate verdicts, adapter routing
-- decisions, and attempt lifecycle per message_run_id.
-- Downstream of SID, feeds into CET (lcs.event).
--
-- Rules:
--   NO UPDATE allowed
--   NO DELETE allowed
--   By-value references only (no FKs)
--   Each delivery attempt = new row (append-only pattern)
--   No JSONB columns (structured columns only)
-- ═══════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════
-- Section 2: Immutability Triggers (Append-Only Enforcement)
-- ═══════════════════════════════════════════════════════════════

-- CID: Block all UPDATE and DELETE
CREATE OR REPLACE FUNCTION lcs.prevent_cid_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'lcs.cid is append-only — UPDATE and DELETE are prohibited';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lcs_cid_no_update
    BEFORE UPDATE ON lcs.cid
    FOR EACH ROW
    EXECUTE FUNCTION lcs.prevent_cid_mutation();

CREATE TRIGGER trg_lcs_cid_no_delete
    BEFORE DELETE ON lcs.cid
    FOR EACH ROW
    EXECUTE FUNCTION lcs.prevent_cid_mutation();

-- SID_OUTPUT: Block all UPDATE and DELETE
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

-- MID_SEQUENCE_STATE: Block all UPDATE and DELETE
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

-- ═══════════════════════════════════════════════════════════════
-- Section 3: SID Trigger (DB trigger for Phase 3 worker)
-- Fires on COMPILED CID inserts and emits deterministic NOTIFY payload.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION lcs.notify_sid_worker()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.compilation_status = 'COMPILED' THEN
        PERFORM pg_notify(
            'lcs_sid_worker',
            json_build_object(
                'communication_id', NEW.communication_id,
                'signal_queue_id', NEW.signal_queue_id,
                'sovereign_company_id', NEW.sovereign_company_id,
                'created_at', NEW.created_at
            )::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lcs_cid_notify_sid_worker
    AFTER INSERT ON lcs.cid
    FOR EACH ROW
    EXECUTE FUNCTION lcs.notify_sid_worker();

-- ═══════════════════════════════════════════════════════════════
-- Section 4: ALTER lcs.frame_registry
-- Add CID/SID/MID pipeline integration columns
-- All nullable for backward compatibility with existing rows
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE lcs.frame_registry
    ADD COLUMN cid_compilation_rule TEXT,
    ADD COLUMN sid_template_id      TEXT,
    ADD COLUMN mid_sequence_type    TEXT,
    ADD COLUMN mid_delay_hours      INT,
    ADD COLUMN mid_max_attempts     INT DEFAULT 3;

-- CHECK constraints on new columns (nullable-safe)
ALTER TABLE lcs.frame_registry
    ADD CONSTRAINT chk_frame_cid_compilation_rule CHECK (
        cid_compilation_rule IS NULL OR cid_compilation_rule IN ('STANDARD', 'STRICT', 'LITE')
    ),
    ADD CONSTRAINT chk_frame_mid_sequence_type CHECK (
        mid_sequence_type IS NULL OR mid_sequence_type IN ('IMMEDIATE', 'DELAYED', 'BATCH')
    ),
    ADD CONSTRAINT chk_frame_mid_delay_hours CHECK (
        mid_delay_hours IS NULL OR mid_delay_hours BETWEEN 0 AND 720
    ),
    ADD CONSTRAINT chk_frame_mid_max_attempts CHECK (
        mid_max_attempts IS NULL OR mid_max_attempts BETWEEN 1 AND 10
    );

-- ═══════════════════════════════════════════════════════════════
-- Section 5: Indexes
-- ═══════════════════════════════════════════════════════════════

-- CID indexes
CREATE INDEX idx_lcs_cid_company ON lcs.cid (sovereign_company_id);
CREATE INDEX idx_lcs_cid_phase ON lcs.cid (lifecycle_phase);
CREATE INDEX idx_lcs_cid_created ON lcs.cid (created_at);
CREATE INDEX idx_lcs_cid_status ON lcs.cid (compilation_status);
CREATE INDEX idx_lcs_cid_signal ON lcs.cid (signal_set_hash);
CREATE INDEX idx_lcs_cid_frame ON lcs.cid (frame_id);
CREATE INDEX idx_lcs_cid_compiled ON lcs.cid (created_at)
    WHERE compilation_status = 'COMPILED';

-- SID_OUTPUT indexes
CREATE INDEX idx_lcs_sid_comm_id ON lcs.sid_output (communication_id);
CREATE INDEX idx_lcs_sid_created ON lcs.sid_output (created_at);
CREATE INDEX idx_lcs_sid_status ON lcs.sid_output (construction_status);
CREATE INDEX idx_lcs_sid_constructed ON lcs.sid_output (created_at)
    WHERE construction_status = 'CONSTRUCTED';

-- MID_SEQUENCE_STATE indexes
CREATE INDEX idx_lcs_mid_comm_id ON lcs.mid_sequence_state (communication_id);
CREATE INDEX idx_lcs_mid_run_id ON lcs.mid_sequence_state (message_run_id);
CREATE INDEX idx_lcs_mid_created ON lcs.mid_sequence_state (created_at);
CREATE INDEX idx_lcs_mid_delivery ON lcs.mid_sequence_state (delivery_status);
CREATE INDEX idx_lcs_mid_pending ON lcs.mid_sequence_state (created_at)
    WHERE delivery_status = 'PENDING';
CREATE INDEX idx_lcs_mid_adapter ON lcs.mid_sequence_state (adapter_type, channel);

-- ═══════════════════════════════════════════════════════════════
-- Section 6: Comments
-- ═══════════════════════════════════════════════════════════════

-- CID comments
COMMENT ON TABLE lcs.cid IS 'CID Compiler Registry — append-only ledger of all minted communication_ids with compilation state, signal source, frame binding. Origin of CID→SID→MID→CET flow.';
COMMENT ON COLUMN lcs.cid.communication_id IS 'Minted communication ID. Format: LCS-{PHASE}-{YYYYMMDD}-{ULID}. Primary key, immutable.';
COMMENT ON COLUMN lcs.cid.sovereign_company_id IS 'Target company, references cl.company_identity by value (not FK).';
COMMENT ON COLUMN lcs.cid.signal_queue_id IS 'Source signal_queue entry that triggered compilation. Nullable for manual mints.';
COMMENT ON COLUMN lcs.cid.compilation_status IS 'Compilation outcome: COMPILED (success), FAILED (data issue), BLOCKED (gate/throttle).';
COMMENT ON COLUMN lcs.cid.intelligence_tier IS 'Intelligence tier 1-5 from v_company_intelligence snapshot at compilation time.';

-- SID_OUTPUT comments
COMMENT ON TABLE lcs.sid_output IS 'SID Message Construction Output — append-only record of message construction per communication. Captures template resolution, content, and recipient details.';
COMMENT ON COLUMN lcs.sid_output.sid_id IS 'Unique SID output identifier, auto-generated UUID.';
COMMENT ON COLUMN lcs.sid_output.communication_id IS 'References lcs.cid.communication_id by value (not FK).';
COMMENT ON COLUMN lcs.sid_output.template_id IS 'Resolved template identifier used for message construction.';
COMMENT ON COLUMN lcs.sid_output.construction_status IS 'Construction outcome: CONSTRUCTED (success), FAILED (template/data issue), BLOCKED (gate).';

-- MID_SEQUENCE_STATE comments
COMMENT ON TABLE lcs.mid_sequence_state IS 'MID Delivery Sequence State — append-only record of delivery sequencing, gate verdicts, adapter routing, and attempt lifecycle. Each attempt = new row.';
COMMENT ON COLUMN lcs.mid_sequence_state.mid_id IS 'Unique MID sequence state identifier, auto-generated UUID.';
COMMENT ON COLUMN lcs.mid_sequence_state.message_run_id IS 'Delivery attempt ID. Format: RUN-LCS-{PHASE}-{YYYYMMDD}-{ULID}-{CHANNEL}-{ATTEMPT}. References CET by value.';
COMMENT ON COLUMN lcs.mid_sequence_state.communication_id IS 'References lcs.cid.communication_id by value (not FK).';
COMMENT ON COLUMN lcs.mid_sequence_state.gate_verdict IS 'Pre-delivery gate verdict: PASS (proceed), FAIL (blocked), SKIP (not applicable).';
COMMENT ON COLUMN lcs.mid_sequence_state.throttle_status IS 'Throttle state at routing time: CLEAR or THROTTLED_RECIPIENT/COMPANY/ADAPTER.';

-- Frame registry new column comments
COMMENT ON COLUMN lcs.frame_registry.cid_compilation_rule IS 'CID compilation rule: STANDARD (normal checks), STRICT (all fields required), LITE (minimal checks).';
COMMENT ON COLUMN lcs.frame_registry.sid_template_id IS 'SID template identifier for message construction. References template catalog by value.';
COMMENT ON COLUMN lcs.frame_registry.mid_sequence_type IS 'MID delivery sequence type: IMMEDIATE (send now), DELAYED (wait mid_delay_hours), BATCH (aggregate).';
COMMENT ON COLUMN lcs.frame_registry.mid_delay_hours IS 'Hours to delay between sequence steps. Applicable when mid_sequence_type = DELAYED.';
COMMENT ON COLUMN lcs.frame_registry.mid_max_attempts IS 'Maximum delivery attempts per channel. Default 3.';

-- ═══════════════════════════════════════════════════════════════
-- Section 7: Grants (PostgREST exposure)
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT ON lcs.cid TO service_role;
    GRANT INSERT ON lcs.cid TO service_role;
    GRANT SELECT ON lcs.sid_output TO service_role;
    GRANT INSERT ON lcs.sid_output TO service_role;
    GRANT SELECT ON lcs.mid_sequence_state TO service_role;
    GRANT INSERT ON lcs.mid_sequence_state TO service_role;
    RAISE NOTICE 'Supabase service_role GRANTs applied for CID/SID/MID tables.';
  ELSE
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hub_reader') THEN
      GRANT SELECT ON lcs.cid TO hub_reader;
      GRANT SELECT ON lcs.sid_output TO hub_reader;
      GRANT SELECT ON lcs.mid_sequence_state TO hub_reader;
    END IF;
    RAISE NOTICE 'Supabase roles not found — applied hub_reader GRANTs only.';
  END IF;
END
$$;

COMMIT;
