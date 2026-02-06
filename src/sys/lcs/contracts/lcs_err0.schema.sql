-- LCS Error Table (ERR0)
-- Classification: APPEND-ONLY
-- Authority: HUB-CL-001
-- Version: 0.1.0
--
-- Rules:
--   NO UPDATE allowed
--   NO DELETE allowed
--   Never blocks CET writes
--   References process_id (by value, not FK)

CREATE TABLE lcs.err0 (
    -- Error identity
    error_id            UUID            NOT NULL    DEFAULT gen_random_uuid(),

    -- Links to execution run (by value, not FK)
    process_id          UUID            NOT NULL,

    -- Optional link to communication attempt (by value, not FK)
    communication_id    UUID,                       -- NULL if failure occurred before CET write

    -- Error classification
    failure_type        TEXT            NOT NULL,   -- [[TBD_BY_HUMAN: define failure_type enum]]
    failure_message     TEXT            NOT NULL,

    -- Context
    lifecycle_phase     TEXT,                       -- 'outreach' | 'sales' | 'client' | NULL
    adapter_type        TEXT,                       -- which adapter failed, if applicable

    -- Timestamp (immutable)
    created_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    -- Constraints
    CONSTRAINT pk_lcs_err0 PRIMARY KEY (error_id)
);

-- Indexes
CREATE INDEX idx_lcs_err0_process_id ON lcs.err0 (process_id);
CREATE INDEX idx_lcs_err0_created_at ON lcs.err0 (created_at);
CREATE INDEX idx_lcs_err0_failure_type ON lcs.err0 (failure_type);

COMMENT ON TABLE lcs.err0 IS 'LCS Error Table — append-only failure log, never blocks CET writes';
COMMENT ON COLUMN lcs.err0.process_id IS 'Execution run that encountered the failure';
COMMENT ON COLUMN lcs.err0.communication_id IS 'Communication attempt that failed, NULL if pre-CET failure';
