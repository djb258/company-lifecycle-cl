-- LCS Canonical Event Table (CET)
-- Classification: APPEND-ONLY
-- Authority: HUB-CL-001
-- Version: 0.1.0
--
-- Rules:
--   NO UPDATE allowed
--   NO DELETE allowed
--   No derived fields
--   No foreign key enforcement beyond IDs
--   Dual-ID model enforced: communication_id + process_id

CREATE SCHEMA IF NOT EXISTS lcs;

CREATE TABLE lcs.event (
    -- Dual-ID Model (both required, both immutable)
    communication_id    UUID            NOT NULL,   -- WHY: the message artifact
    process_id          UUID            NOT NULL,   -- WHO/WHEN/HOW: the execution run

    -- Sovereign identity reference (by value, not FK)
    sovereign_company_id UUID           NOT NULL,   -- from cl.company_identity

    -- Entity target
    entity_type         TEXT            NOT NULL,   -- enum: 'slot' | 'person'
    entity_id           UUID            NOT NULL,   -- upstream entity resolution

    -- Signal and frame
    signal_set_hash     TEXT            NOT NULL,   -- references lcs.signal_registry (by value)
    frame_id            TEXT            NOT NULL,   -- references lcs.frame_registry (by value)

    -- Delivery
    adapter_type        TEXT            NOT NULL,   -- references lcs.adapter_registry (by value)

    -- Lifecycle classification
    lifecycle_phase     TEXT            NOT NULL,   -- enum: 'outreach' | 'sales' | 'client'

    -- Status
    status              TEXT            NOT NULL,   -- [[TBD_BY_HUMAN: define status enum]]

    -- Timestamp (immutable)
    created_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    -- Constraints
    CONSTRAINT pk_lcs_event PRIMARY KEY (communication_id),
    CONSTRAINT chk_entity_type CHECK (entity_type IN ('slot', 'person')),
    CONSTRAINT chk_lifecycle_phase CHECK (lifecycle_phase IN ('outreach', 'sales', 'client'))
    -- [[TBD_BY_HUMAN: add CHECK constraint for status enum when values are finalized]]
);

-- Indexes
CREATE INDEX idx_lcs_event_process_id ON lcs.event (process_id);
CREATE INDEX idx_lcs_event_sovereign_company_id ON lcs.event (sovereign_company_id);
CREATE INDEX idx_lcs_event_entity ON lcs.event (entity_type, entity_id);
CREATE INDEX idx_lcs_event_created_at ON lcs.event (created_at);
CREATE INDEX idx_lcs_event_lifecycle_phase ON lcs.event (lifecycle_phase);

COMMENT ON TABLE lcs.event IS 'LCS Canonical Event Table — append-only ledger of all communication events';
COMMENT ON COLUMN lcs.event.communication_id IS 'Message artifact ID — WHY this event exists';
COMMENT ON COLUMN lcs.event.process_id IS 'Execution run ID — WHO/WHEN/HOW this event was produced';
