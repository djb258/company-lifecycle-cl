-- LCS Frame Registry
-- Classification: REGISTRY (configuration only)
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Version: 2.2.0
--
-- Rules:
--   Configuration only — no execution data
--   INSERT and UPDATE allowed (config changes)
--   NO DELETE — soft-deactivate via is_active = false
--   Preserves CET referential integrity by value

CREATE TABLE lcs.frame_registry (
    -- Frame identity
    frame_id            TEXT            NOT NULL,   -- unique frame identifier
    frame_name          TEXT            NOT NULL,   -- human-readable name

    -- Classification
    lifecycle_phase     TEXT            NOT NULL,   -- OUTREACH | SALES | CLIENT
    frame_type          TEXT            NOT NULL,   -- canonical frame type

    -- Intelligence requirements
    tier                INT             NOT NULL,   -- which intelligence tier this frame requires (1-5)
    required_fields     JSONB           NOT NULL    DEFAULT '[]',  -- array of field names from intelligence snapshot
    fallback_frame      TEXT,                       -- references another frame_id if required_fields are missing (by value)

    -- Channel and sequencing
    channel             TEXT,                       -- delivery channel this frame targets
    step_in_sequence    INT,                        -- which step in hammer/sequence (nullable for non-sequence frames)

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
    CONSTRAINT chk_frame_lifecycle_phase CHECK (lifecycle_phase IN ('OUTREACH', 'SALES', 'CLIENT')),
    CONSTRAINT chk_frame_type CHECK (frame_type IN (
        'HAMMER', 'NEWSLETTER', 'POND', 'MEETING_FOLLOWUP',
        'EMPLOYEE_COMM', 'RENEWAL_NOTICE', 'ONBOARDING'
    )),
    CONSTRAINT chk_frame_tier CHECK (tier BETWEEN 1 AND 5),
    CONSTRAINT chk_frame_channel CHECK (channel IN ('MG', 'HR'))
);

-- Comments
COMMENT ON TABLE lcs.frame_registry IS 'LCS Frame Registry — declarative catalog of known message frames with intelligence tier requirements and fallback cascading';
COMMENT ON COLUMN lcs.frame_registry.tier IS 'Intelligence tier 1-5 this frame requires. Higher tier = more data required.';
COMMENT ON COLUMN lcs.frame_registry.required_fields IS 'JSON array of field names required from v_company_intelligence (e.g., ["ceo_name", "plan_year_end", "participant_count"])';
COMMENT ON COLUMN lcs.frame_registry.fallback_frame IS 'Frame to cascade to if required_fields are missing. References another frame_id by value (self-referential).';
COMMENT ON COLUMN lcs.frame_registry.step_in_sequence IS 'Position in hammer/sequence (nullable for non-sequence frames like NEWSLETTER or POND)';
