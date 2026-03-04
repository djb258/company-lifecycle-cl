-- LCS CID Compiler Registry
-- Classification: CANONICAL (APPEND-ONLY)
-- Authority: HUB-CL-001, SUBHUB-CL-LCS, SH-LCS-PIPELINE
-- Version: 1.0.0
-- Migration: 005_lcs_cid_sid_mid.sql
--
-- Purpose: Tracks all minted communication_ids with compilation state,
--   signal source, frame binding, and company reference.
--   Origin point of the CID → SID → MID → CET flow.
--
-- Rules:
--   NO UPDATE allowed (immutability trigger enforced)
--   NO DELETE allowed (immutability trigger enforced)
--   By-value references only (no FKs)
--   communication_id format: LCS-{PHASE}-{YYYYMMDD}-{ULID}

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

-- Immutability triggers
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

-- SID worker trigger (Phase 3): emit notify when COMPILED CID is inserted
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

-- Indexes
CREATE INDEX idx_lcs_cid_company ON lcs.cid (sovereign_company_id);
CREATE INDEX idx_lcs_cid_phase ON lcs.cid (lifecycle_phase);
CREATE INDEX idx_lcs_cid_created ON lcs.cid (created_at);
CREATE INDEX idx_lcs_cid_status ON lcs.cid (compilation_status);
CREATE INDEX idx_lcs_cid_signal ON lcs.cid (signal_set_hash);
CREATE INDEX idx_lcs_cid_frame ON lcs.cid (frame_id);
CREATE INDEX idx_lcs_cid_compiled ON lcs.cid (created_at)
    WHERE compilation_status = 'COMPILED';

-- Comments
COMMENT ON TABLE lcs.cid IS 'CID Compiler Registry — append-only ledger of all minted communication_ids with compilation state, signal source, frame binding. Origin of CID→SID→MID→CET flow.';
COMMENT ON COLUMN lcs.cid.communication_id IS 'Minted communication ID. Format: LCS-{PHASE}-{YYYYMMDD}-{ULID}. Primary key, immutable.';
COMMENT ON COLUMN lcs.cid.sovereign_company_id IS 'Target company, references cl.company_identity by value (not FK).';
COMMENT ON COLUMN lcs.cid.signal_queue_id IS 'Source signal_queue entry that triggered compilation. Nullable for manual mints.';
COMMENT ON COLUMN lcs.cid.compilation_status IS 'Compilation outcome: COMPILED (success), FAILED (data issue), BLOCKED (gate/throttle).';
COMMENT ON COLUMN lcs.cid.intelligence_tier IS 'Intelligence tier 1-5 from v_company_intelligence snapshot at compilation time.';
