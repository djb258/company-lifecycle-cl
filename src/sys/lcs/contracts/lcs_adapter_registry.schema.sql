-- LCS Adapter Registry
-- Classification: REGISTRY (configuration only)
-- Authority: HUB-CL-001
-- Version: 0.1.0
--
-- Rules:
--   Configuration only — no execution data
--   No history tables
--   Enforce required columns but do not populate values

CREATE TABLE lcs.adapter_registry (
    -- Adapter identity
    adapter_type        TEXT            NOT NULL,   -- unique adapter identifier
    adapter_name        TEXT            NOT NULL,   -- human-readable name

    -- Classification
    channel             TEXT            NOT NULL,   -- [[TBD_BY_HUMAN: e.g. 'email', 'linkedin', 'phone']]
    direction           TEXT            NOT NULL    DEFAULT 'outbound',

    -- Description
    description         TEXT,

    -- Status
    is_active           BOOLEAN         NOT NULL    DEFAULT TRUE,

    -- Metadata
    created_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    -- Constraints
    CONSTRAINT pk_lcs_adapter_registry PRIMARY KEY (adapter_type),
    CONSTRAINT uq_lcs_adapter_name UNIQUE (adapter_name),
    CONSTRAINT chk_adapter_direction CHECK (direction IN ('outbound', 'inbound'))
);

COMMENT ON TABLE lcs.adapter_registry IS 'LCS Adapter Registry — declarative catalog of known delivery adapters';
