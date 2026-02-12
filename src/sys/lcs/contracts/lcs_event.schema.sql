-- LCS Canonical Event Table (CET)
-- Classification: APPEND-ONLY
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Version: 2.2.0
--
-- Rules:
--   NO UPDATE allowed (except immutability trigger passthrough on non-ID columns — see below)
--   NO DELETE allowed
--   No derived fields
--   No foreign key enforcement beyond IDs
--   Dual-ID model enforced: communication_id (ULID) + message_run_id (structured)
--   Partitioned monthly by RANGE on created_at

CREATE SCHEMA IF NOT EXISTS lcs;

CREATE TABLE lcs.event (
    -- Dual-ID Model (both required, both immutable)
    communication_id    TEXT            NOT NULL,   -- WHY: the message artifact (format: LCS-{PHASE}-{YYYYMMDD}-{ULID})
    message_run_id      TEXT            NOT NULL,   -- WHO/WHICH/ATTEMPT: the delivery attempt (format: RUN-{COMM_ID}-{CHANNEL}-{ATTEMPT})

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
    channel             TEXT            NOT NULL,   -- delivery channel code
    delivery_status     TEXT            NOT NULL,   -- delivery outcome tracking

    -- Lifecycle classification
    lifecycle_phase     TEXT            NOT NULL,   -- enum: OUTREACH | SALES | CLIENT

    -- Event classification
    event_type          TEXT            NOT NULL,   -- pipeline event classification

    -- Lane
    lane                TEXT            NOT NULL,   -- communication lane

    -- Agent and pipeline step
    agent_number        TEXT            NOT NULL,   -- territory agent
    step_number         INT             NOT NULL,   -- pipeline step: 0=gate block, 1-7=pipeline, 8=webhook, 9=reserved
    step_name           TEXT            NOT NULL,   -- human-readable step name

    -- Payloads (nullable — only populated on relevant steps)
    payload             JSONB,                      -- compiled message payload (send steps only)
    adapter_response    JSONB,                      -- raw adapter response (post-adapter call only)

    -- Intelligence snapshot at composition time
    intelligence_tier   INT,                        -- 1-5, from matview snapshot
    sender_identity     TEXT,                       -- which sender persona was used

    -- Timestamp (immutable)
    created_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    -- Constraints
    CONSTRAINT pk_lcs_event PRIMARY KEY (communication_id, created_at),
    CONSTRAINT chk_entity_type CHECK (entity_type IN ('slot', 'person')),
    CONSTRAINT chk_lifecycle_phase CHECK (lifecycle_phase IN ('OUTREACH', 'SALES', 'CLIENT')),
    CONSTRAINT chk_event_type CHECK (event_type IN (
        'SIGNAL_RECEIVED', 'INTELLIGENCE_COLLECTED', 'FRAME_MATCHED',
        'ID_MINTED', 'AUDIENCE_RESOLVED', 'ADAPTER_CALLED',
        'DELIVERY_SENT', 'DELIVERY_SUCCESS', 'DELIVERY_FAILED', 'DELIVERY_BOUNCED',
        'DELIVERY_COMPLAINED', 'OPENED', 'CLICKED',
        'ERROR_LOGGED', 'SIGNAL_DROPPED', 'COMPOSITION_BLOCKED',
        'RECIPIENT_THROTTLED', 'COMPANY_THROTTLED', 'DATA_STALE', 'FRAME_INELIGIBLE'
    )),
    CONSTRAINT chk_lane CHECK (lane IN ('MAIN', 'LANE_A', 'LANE_B', 'NEWSLETTER')),
    CONSTRAINT chk_delivery_status CHECK (delivery_status IN (
        'PENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED', 'BOUNCED', 'FAILED'
    )),
    CONSTRAINT chk_channel CHECK (channel IN ('MG', 'HR', 'SH')),
    CONSTRAINT chk_communication_id_format CHECK (communication_id ~ '^LCS-(OUT|SAL|CLI)-\d{8}-[A-Z0-9]{10,}$'),
    CONSTRAINT chk_message_run_id_format CHECK (message_run_id ~ '^RUN-LCS-(OUT|SAL|CLI)-\d{8}-[A-Z0-9]{10,}-(MG|HR|SH)-\d{3}$'),
    CONSTRAINT chk_step_number CHECK (step_number BETWEEN 0 AND 9)
) PARTITION BY RANGE (created_at);

-- ═══════════════════════════════════════════════════════════════════
-- Monthly Partitions
-- ═══════════════════════════════════════════════════════════════════
-- NOTE: A cron function should auto-create future partitions monthly.
-- These are the initial 3 partitions for launch.

CREATE TABLE lcs.event_2026_02 PARTITION OF lcs.event
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE lcs.event_2026_03 PARTITION OF lcs.event
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE lcs.event_2026_04 PARTITION OF lcs.event
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- ═══════════════════════════════════════════════════════════════════
-- Indexes (7 standard + 2 partial)
-- ═══════════════════════════════════════════════════════════════════
-- PostgreSQL 11+ auto-creates per-partition indexes from these definitions.

-- Standard indexes
CREATE INDEX idx_lcs_event_comm_id ON lcs.event (communication_id);
CREATE INDEX idx_lcs_event_company ON lcs.event (sovereign_company_id);
CREATE INDEX idx_lcs_event_phase ON lcs.event (lifecycle_phase);
CREATE INDEX idx_lcs_event_delivery ON lcs.event (delivery_status);
CREATE INDEX idx_lcs_event_created ON lcs.event (created_at);
CREATE INDEX idx_lcs_event_agent ON lcs.event (agent_number);
CREATE INDEX idx_lcs_event_composite ON lcs.event (sovereign_company_id, lifecycle_phase, created_at DESC);

-- Partial indexes
CREATE INDEX idx_lcs_event_failed ON lcs.event (communication_id, created_at)
    WHERE delivery_status IN ('FAILED', 'BOUNCED');
CREATE INDEX idx_lcs_event_pending ON lcs.event (communication_id, created_at)
    WHERE delivery_status = 'PENDING';

-- ═══════════════════════════════════════════════════════════════════
-- Immutability Trigger
-- ═══════════════════════════════════════════════════════════════════
-- communication_id is immutable once inserted. This trigger blocks any UPDATE
-- that attempts to change the communication_id value.

CREATE OR REPLACE FUNCTION lcs.prevent_comm_id_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.communication_id IS DISTINCT FROM NEW.communication_id THEN
        RAISE EXCEPTION 'communication_id is immutable — updates are prohibited';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lcs_event_immutable_comm_id
    BEFORE UPDATE ON lcs.event
    FOR EACH ROW
    EXECUTE FUNCTION lcs.prevent_comm_id_update();

-- ═══════════════════════════════════════════════════════════════════
-- Comments
-- ═══════════════════════════════════════════════════════════════════

COMMENT ON TABLE lcs.event IS 'LCS Canonical Event Table — append-only ledger of all communication events, partitioned monthly on created_at';
COMMENT ON COLUMN lcs.event.communication_id IS 'Message artifact ID (ULID) — WHY this event exists. Format: LCS-{PHASE}-{YYYYMMDD}-{ULID}. UNIQUE + IMMUTABLE.';
COMMENT ON COLUMN lcs.event.message_run_id IS 'Delivery attempt ID — WHO sent it, WHICH channel, WHICH attempt. Format: RUN-{COMM_ID}-{CHANNEL}-{ATTEMPT}. NOT unique (retries share one composition).';
COMMENT ON COLUMN lcs.event.event_type IS 'Pipeline event classification — replaces v0.1 status column. 17 canonical event types.';
COMMENT ON COLUMN lcs.event.delivery_status IS 'Delivery outcome tracking: PENDING → SENT → DELIVERED/OPENED/CLICKED/REPLIED or BOUNCED/FAILED';
COMMENT ON COLUMN lcs.event.lane IS 'Communication lane: MAIN (hammer sequences), LANE_A/LANE_B (A/B tests), NEWSLETTER';
COMMENT ON COLUMN lcs.event.intelligence_tier IS 'Intelligence tier 1-5 from v_company_intelligence snapshot at composition time';
