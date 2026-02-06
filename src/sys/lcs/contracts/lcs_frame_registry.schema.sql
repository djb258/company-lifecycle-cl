-- LCS Frame Registry
-- Classification: REGISTRY (configuration only)
-- Authority: HUB-CL-001
-- Version: 0.1.0
--
-- Rules:
--   Configuration only — no execution data
--   No history tables
--   Enforce required columns but do not populate values

CREATE TABLE lcs.frame_registry (
    -- Frame identity
    frame_id            TEXT            NOT NULL,   -- unique frame identifier
    frame_name          TEXT            NOT NULL,   -- human-readable name

    -- Classification
    lifecycle_phase     TEXT            NOT NULL,   -- 'outreach' | 'sales' | 'client'
    frame_type          TEXT            NOT NULL,   -- [[TBD_BY_HUMAN: define frame types]]

    -- Description
    description         TEXT,

    -- Status
    is_active           BOOLEAN         NOT NULL    DEFAULT TRUE,

    -- Metadata
    created_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    -- Constraints
    CONSTRAINT pk_lcs_frame_registry PRIMARY KEY (frame_id),
    CONSTRAINT uq_lcs_frame_name UNIQUE (frame_name),
    CONSTRAINT chk_frame_lifecycle_phase CHECK (lifecycle_phase IN ('outreach', 'sales', 'client'))
);

COMMENT ON TABLE lcs.frame_registry IS 'LCS Frame Registry — declarative catalog of known message frames';
