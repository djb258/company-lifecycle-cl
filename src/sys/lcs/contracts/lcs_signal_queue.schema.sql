-- LCS Signal Queue
-- Classification: QUEUE (transactional, mutable)
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Version: 2.2.0
--
-- Purpose: Incoming signal staging. Bridge functions from people/dol/blog
--   pressure_signals tables write here. Cron runner reads PENDING rows.
--   Rows are updated to COMPLETED/FAILED/SKIPPED after processing.

CREATE TABLE lcs.signal_queue (
    id                  UUID            NOT NULL    DEFAULT gen_random_uuid(),

    -- Signal identity
    signal_set_hash     TEXT            NOT NULL,
    signal_category     TEXT            NOT NULL,

    -- Target
    sovereign_company_id UUID           NOT NULL,
    lifecycle_phase     TEXT            NOT NULL,

    -- Routing hints (nullable — cron runner uses defaults if absent)
    preferred_channel   TEXT,
    preferred_lane      TEXT,
    agent_number        TEXT,

    -- Signal payload (from pressure_signals.signal_value)
    signal_data         JSONB           NOT NULL    DEFAULT '{}',

    -- Source traceability
    source_hub          TEXT            NOT NULL,   -- 'PEOPLE' | 'DOL' | 'BLOG'
    source_signal_id    UUID,                       -- FK to pressure_signals.signal_id (by value)

    -- Queue management
    status              TEXT            NOT NULL    DEFAULT 'PENDING',
    priority            INT             NOT NULL    DEFAULT 0,

    -- Timestamps
    created_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    processed_at        TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT pk_lcs_signal_queue PRIMARY KEY (id),
    CONSTRAINT chk_sq_lifecycle_phase CHECK (lifecycle_phase IN ('OUTREACH', 'SALES', 'CLIENT')),
    CONSTRAINT chk_sq_status CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'SKIPPED')),
    CONSTRAINT chk_sq_channel CHECK (preferred_channel IS NULL OR preferred_channel IN ('MG', 'HR', 'SH')),
    CONSTRAINT chk_sq_lane CHECK (preferred_lane IS NULL OR preferred_lane IN ('MAIN', 'LANE_A', 'LANE_B', 'NEWSLETTER')),
    CONSTRAINT chk_sq_source_hub CHECK (source_hub IN ('PEOPLE', 'DOL', 'BLOG', 'MANUAL'))
);

-- Indexes
CREATE INDEX idx_lcs_sq_pending ON lcs.signal_queue (created_at)
    WHERE status = 'PENDING';
CREATE INDEX idx_lcs_sq_company ON lcs.signal_queue (sovereign_company_id);
CREATE INDEX idx_lcs_sq_source ON lcs.signal_queue (source_hub, source_signal_id);

-- Idempotency: prevent duplicate signals from same source
CREATE UNIQUE INDEX idx_lcs_sq_dedup ON lcs.signal_queue (source_hub, source_signal_id)
    WHERE source_signal_id IS NOT NULL AND status = 'PENDING';

COMMENT ON TABLE lcs.signal_queue IS 'LCS Signal Queue — staging table for incoming signals. Bridge functions write PENDING rows, cron runner processes them.';
COMMENT ON COLUMN lcs.signal_queue.source_hub IS 'Which sub-hub originated this signal: PEOPLE, DOL, BLOG, or MANUAL';
COMMENT ON COLUMN lcs.signal_queue.source_signal_id IS 'Traceability back to source pressure_signals.signal_id (by value, not FK)';
