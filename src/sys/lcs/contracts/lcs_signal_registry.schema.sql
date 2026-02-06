-- LCS Signal Registry
-- Classification: REGISTRY (configuration only)
-- Authority: HUB-CL-001
-- Version: 0.1.0
--
-- Rules:
--   Configuration only — no execution data
--   No history tables
--   Enforce required columns but do not populate values

CREATE TABLE lcs.signal_registry (
    -- Signal identity
    signal_set_hash     TEXT            NOT NULL,   -- deterministic hash of signal configuration
    signal_name         TEXT            NOT NULL,   -- human-readable name

    -- Classification
    lifecycle_phase     TEXT            NOT NULL,   -- 'outreach' | 'sales' | 'client'
    signal_category     TEXT            NOT NULL,   -- [[TBD_BY_HUMAN: define categories]]

    -- Description
    description         TEXT,

    -- Status
    is_active           BOOLEAN         NOT NULL    DEFAULT TRUE,

    -- Metadata
    created_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    -- Constraints
    CONSTRAINT pk_lcs_signal_registry PRIMARY KEY (signal_set_hash),
    CONSTRAINT uq_lcs_signal_name UNIQUE (signal_name),
    CONSTRAINT chk_signal_lifecycle_phase CHECK (lifecycle_phase IN ('outreach', 'sales', 'client'))
);

COMMENT ON TABLE lcs.signal_registry IS 'LCS Signal Registry — declarative catalog of known signal sets';
