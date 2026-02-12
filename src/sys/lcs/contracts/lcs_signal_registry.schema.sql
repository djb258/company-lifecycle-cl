-- LCS Signal Registry
-- Classification: REGISTRY (configuration only)
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Version: 2.2.0
--
-- Rules:
--   Configuration only — no execution data
--   INSERT and UPDATE allowed (config changes)
--   NO DELETE — soft-deactivate via is_active = false
--   Preserves CET referential integrity by value

CREATE TABLE lcs.signal_registry (
    -- Signal identity
    signal_set_hash     TEXT            NOT NULL,   -- deterministic hash of signal configuration
    signal_name         TEXT            NOT NULL,   -- human-readable name

    -- Classification
    lifecycle_phase     TEXT            NOT NULL,   -- OUTREACH | SALES | CLIENT
    signal_category     TEXT            NOT NULL,   -- canonical signal category

    -- Description
    description         TEXT,

    -- Freshness tracking
    data_fetched_at     TIMESTAMPTZ,                -- when signal data was last fetched from source
    data_expires_at     TIMESTAMPTZ,                -- when signal data becomes stale (computed: data_fetched_at + freshness_window)
    freshness_window    INTERVAL        NOT NULL    DEFAULT '30 days',  -- how long data stays fresh

    -- Signal validity scoring
    signal_validity_score   NUMERIC(3,2),           -- computed score 0.00-1.00
    validity_threshold      NUMERIC(3,2)  NOT NULL  DEFAULT 0.50,       -- minimum score to proceed

    -- Status
    is_active           BOOLEAN         NOT NULL    DEFAULT TRUE,

    -- Metadata
    created_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    -- Constraints
    CONSTRAINT pk_lcs_signal_registry PRIMARY KEY (signal_set_hash),
    CONSTRAINT uq_lcs_signal_name UNIQUE (signal_name),
    CONSTRAINT chk_signal_lifecycle_phase CHECK (lifecycle_phase IN ('OUTREACH', 'SALES', 'CLIENT')),
    CONSTRAINT chk_signal_category CHECK (signal_category IN (
        'RENEWAL_PROXIMITY', 'PLAN_CHANGE', 'GROWTH_SIGNAL', 'ENGAGEMENT_SIGNAL',
        'BLOG_TRIGGER', 'SITEMAP_CHANGE', 'MEETING_BOOKED', 'REPLY_RECEIVED', 'MANUAL_TRIGGER'
    )),
    CONSTRAINT chk_validity_score_range CHECK (signal_validity_score BETWEEN 0.00 AND 1.00),
    CONSTRAINT chk_validity_threshold_range CHECK (validity_threshold BETWEEN 0.00 AND 1.00)
);

-- Comments
COMMENT ON TABLE lcs.signal_registry IS 'LCS Signal Registry — declarative catalog of known signal sets with freshness tracking and validity scoring';
COMMENT ON COLUMN lcs.signal_registry.freshness_window IS 'How long fetched data stays fresh before expiry. Default 30 days.';
COMMENT ON COLUMN lcs.signal_registry.signal_validity_score IS 'Computed signal validity score 0.00-1.00. Below threshold = signal dropped.';
