-- LCS Error Table (ERR0)
-- Classification: APPEND-ONLY
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Version: 2.2.0
--
-- Rules:
--   NO UPDATE allowed
--   NO DELETE allowed
--   Never blocks CET writes
--   References message_run_id (by value, not FK)
--   ORBT 3-strike protocol: AUTO_RETRY → ALT_CHANNEL → HUMAN_ESCALATION

CREATE TABLE lcs.err0 (
    -- Error identity
    error_id            UUID            NOT NULL    DEFAULT gen_random_uuid(),

    -- Links to delivery attempt (by value, not FK)
    message_run_id      TEXT            NOT NULL,

    -- Optional link to communication attempt (by value, not FK)
    communication_id    TEXT,                       -- NULL if failure occurred before CET write

    -- Sovereign identity reference (by value, not FK)
    sovereign_company_id TEXT,                      -- nullable, for cross-referencing errors to companies

    -- Error classification
    failure_type        TEXT            NOT NULL,
    failure_message     TEXT            NOT NULL,

    -- Context
    lifecycle_phase     TEXT,                       -- OUTREACH | SALES | CLIENT | NULL
    adapter_type        TEXT,                       -- which adapter failed, if applicable

    -- ORBT Strike Protocol
    orbt_strike_number      INT,                    -- 1, 2, or 3 (nullable — not all errors are ORBT)
    orbt_action_taken       TEXT,                   -- action taken for this strike
    orbt_alt_channel_eligible BOOLEAN,              -- was alt-channel checked?
    orbt_alt_channel_reason TEXT,                   -- why alt-channel passed or failed

    -- Timestamp (immutable)
    created_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    -- Constraints
    CONSTRAINT pk_lcs_err0 PRIMARY KEY (error_id),
    CONSTRAINT chk_failure_type CHECK (failure_type IN (
        'ADAPTER_ERROR', 'TIMEOUT', 'VALIDATION_ERROR', 'RATE_LIMIT',
        'BOUNCE_HARD', 'BOUNCE_SOFT', 'COMPLAINT', 'AUTH_FAILURE',
        'PAYLOAD_REJECTED', 'CONNECTION_FAILED', 'UNKNOWN'
    )),
    CONSTRAINT chk_lifecycle_phase CHECK (lifecycle_phase IN ('OUTREACH', 'SALES', 'CLIENT')),
    CONSTRAINT chk_orbt_action CHECK (orbt_action_taken IN ('AUTO_RETRY', 'ALT_CHANNEL', 'HUMAN_ESCALATION')),
    CONSTRAINT chk_orbt_strike CHECK (orbt_strike_number BETWEEN 1 AND 3)
);

-- Indexes
CREATE INDEX idx_lcs_err0_message_run_id ON lcs.err0 (message_run_id);
CREATE INDEX idx_lcs_err0_created_at ON lcs.err0 (created_at);
CREATE INDEX idx_lcs_err0_failure_type ON lcs.err0 (failure_type);
CREATE INDEX idx_lcs_err0_company ON lcs.err0 (sovereign_company_id) WHERE sovereign_company_id IS NOT NULL;

-- Comments
COMMENT ON TABLE lcs.err0 IS 'LCS Error Table — append-only failure log with ORBT 3-strike protocol, never blocks CET writes';
COMMENT ON COLUMN lcs.err0.message_run_id IS 'Delivery attempt that encountered the failure (by value, not FK)';
COMMENT ON COLUMN lcs.err0.communication_id IS 'Communication attempt that failed, NULL if pre-CET failure';
COMMENT ON COLUMN lcs.err0.orbt_strike_number IS 'ORBT strike: 1=AUTO_RETRY, 2=ALT_CHANNEL, 3=HUMAN_ESCALATION';
COMMENT ON COLUMN lcs.err0.orbt_action_taken IS 'Action taken at this strike level per ORBT protocol';
