-- ═══════════════════════════════════════════════════════════════
-- LCS Schema Migration v2.2.0
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Generated: 2026-02-12
--
-- Execution:
--   psql $NEON_CONNECTION_STRING -f migrations/lcs/001_lcs_schema_v2.2.0.sql
--
-- Rollback:
--   DROP SCHEMA lcs CASCADE;
--
-- Prerequisites (must exist in Neon BEFORE running):
--   cl.company_identity (spine table)
--   people.people_master
--   people.company_slot
--   outreach.outreach
--   outreach.dol
--   outreach.blog
--   company.company_source_urls
--
-- Contents (10 contracts):
--   Section 1: Schema creation
--   Section 2: Tables (6) — event, err0, signal_registry, frame_registry, adapter_registry, signal_queue
--   Section 3: Materialized Views (3) — v_latest_by_entity, v_latest_by_company, v_company_intelligence
--   Section 4: Functions (1) — refresh_lcs_matview
--   Section 5: Grants (PostgREST exposure)
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- Section 1: Schema Creation
-- ═══════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS lcs;

-- ═══════════════════════════════════════════════════════════════
-- Section 2: Tables
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- Source: src/sys/lcs/contracts/lcs_event.schema.sql
-- ═══════════════════════════════════════════════════════════════

-- LCS Canonical Event Table (CET)
-- Classification: APPEND-ONLY
-- Version: 2.2.0
--
-- Rules:
--   NO UPDATE allowed (except immutability trigger passthrough on non-ID columns — see below)
--   NO DELETE allowed
--   No derived fields
--   No foreign key enforcement beyond IDs
--   Dual-ID model enforced: communication_id (ULID) + message_run_id (structured)
--   Partitioned monthly by RANGE on created_at

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

-- Monthly Partitions
-- NOTE: A cron function should auto-create future partitions monthly.
-- These are the initial 3 partitions for launch.

CREATE TABLE lcs.event_2026_02 PARTITION OF lcs.event
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE lcs.event_2026_03 PARTITION OF lcs.event
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE lcs.event_2026_04 PARTITION OF lcs.event
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- Indexes (7 standard + 2 partial)
-- PostgreSQL 11+ auto-creates per-partition indexes from these definitions.

CREATE INDEX idx_lcs_event_comm_id ON lcs.event (communication_id);
CREATE INDEX idx_lcs_event_company ON lcs.event (sovereign_company_id);
CREATE INDEX idx_lcs_event_phase ON lcs.event (lifecycle_phase);
CREATE INDEX idx_lcs_event_delivery ON lcs.event (delivery_status);
CREATE INDEX idx_lcs_event_created ON lcs.event (created_at);
CREATE INDEX idx_lcs_event_agent ON lcs.event (agent_number);
CREATE INDEX idx_lcs_event_composite ON lcs.event (sovereign_company_id, lifecycle_phase, created_at DESC);

CREATE INDEX idx_lcs_event_failed ON lcs.event (communication_id, created_at)
    WHERE delivery_status IN ('FAILED', 'BOUNCED');
CREATE INDEX idx_lcs_event_pending ON lcs.event (communication_id, created_at)
    WHERE delivery_status = 'PENDING';

-- Immutability Trigger

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

-- Comments

COMMENT ON TABLE lcs.event IS 'LCS Canonical Event Table — append-only ledger of all communication events, partitioned monthly on created_at';
COMMENT ON COLUMN lcs.event.communication_id IS 'Message artifact ID (ULID) — WHY this event exists. Format: LCS-{PHASE}-{YYYYMMDD}-{ULID}. UNIQUE + IMMUTABLE.';
COMMENT ON COLUMN lcs.event.message_run_id IS 'Delivery attempt ID — WHO sent it, WHICH channel, WHICH attempt. Format: RUN-{COMM_ID}-{CHANNEL}-{ATTEMPT}. NOT unique (retries share one composition).';
COMMENT ON COLUMN lcs.event.event_type IS 'Pipeline event classification — replaces v0.1 status column. 20 canonical event types.';
COMMENT ON COLUMN lcs.event.delivery_status IS 'Delivery outcome tracking: PENDING → SENT → DELIVERED/OPENED/CLICKED/REPLIED or BOUNCED/FAILED';
COMMENT ON COLUMN lcs.event.lane IS 'Communication lane: MAIN (hammer sequences), LANE_A/LANE_B (A/B tests), NEWSLETTER';
COMMENT ON COLUMN lcs.event.intelligence_tier IS 'Intelligence tier 1-5 from v_company_intelligence snapshot at composition time';

-- ═══════════════════════════════════════════════════════════════
-- Source: src/sys/lcs/contracts/lcs_err0.schema.sql
-- ═══════════════════════════════════════════════════════════════

-- LCS Error Table (ERR0)
-- Classification: APPEND-ONLY
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

CREATE INDEX idx_lcs_err0_message_run_id ON lcs.err0 (message_run_id);
CREATE INDEX idx_lcs_err0_created_at ON lcs.err0 (created_at);
CREATE INDEX idx_lcs_err0_failure_type ON lcs.err0 (failure_type);
CREATE INDEX idx_lcs_err0_company ON lcs.err0 (sovereign_company_id) WHERE sovereign_company_id IS NOT NULL;

COMMENT ON TABLE lcs.err0 IS 'LCS Error Table — append-only failure log with ORBT 3-strike protocol, never blocks CET writes';
COMMENT ON COLUMN lcs.err0.message_run_id IS 'Delivery attempt that encountered the failure (by value, not FK)';
COMMENT ON COLUMN lcs.err0.communication_id IS 'Communication attempt that failed, NULL if pre-CET failure';
COMMENT ON COLUMN lcs.err0.orbt_strike_number IS 'ORBT strike: 1=AUTO_RETRY, 2=ALT_CHANNEL, 3=HUMAN_ESCALATION';
COMMENT ON COLUMN lcs.err0.orbt_action_taken IS 'Action taken at this strike level per ORBT protocol';

-- ═══════════════════════════════════════════════════════════════
-- Source: src/sys/lcs/contracts/lcs_signal_registry.schema.sql
-- ═══════════════════════════════════════════════════════════════

-- LCS Signal Registry
-- Classification: REGISTRY (configuration only)
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

COMMENT ON TABLE lcs.signal_registry IS 'LCS Signal Registry — declarative catalog of known signal sets with freshness tracking and validity scoring';
COMMENT ON COLUMN lcs.signal_registry.freshness_window IS 'How long fetched data stays fresh before expiry. Default 30 days.';
COMMENT ON COLUMN lcs.signal_registry.signal_validity_score IS 'Computed signal validity score 0.00-1.00. Below threshold = signal dropped.';

-- ═══════════════════════════════════════════════════════════════
-- Source: src/sys/lcs/contracts/lcs_frame_registry.schema.sql
-- ═══════════════════════════════════════════════════════════════

-- LCS Frame Registry
-- Classification: REGISTRY (configuration only)
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

COMMENT ON TABLE lcs.frame_registry IS 'LCS Frame Registry — declarative catalog of known message frames with intelligence tier requirements and fallback cascading';
COMMENT ON COLUMN lcs.frame_registry.tier IS 'Intelligence tier 1-5 this frame requires. Higher tier = more data required.';
COMMENT ON COLUMN lcs.frame_registry.required_fields IS 'JSON array of field names required from v_company_intelligence (e.g., ["ceo_name", "plan_year_end", "participant_count"])';
COMMENT ON COLUMN lcs.frame_registry.fallback_frame IS 'Frame to cascade to if required_fields are missing. References another frame_id by value (self-referential).';
COMMENT ON COLUMN lcs.frame_registry.step_in_sequence IS 'Position in hammer/sequence (nullable for non-sequence frames like NEWSLETTER or POND)';

-- ═══════════════════════════════════════════════════════════════
-- Source: src/sys/lcs/contracts/lcs_adapter_registry.schema.sql
-- ═══════════════════════════════════════════════════════════════

-- LCS Adapter Registry
-- Classification: REGISTRY (configuration only)
-- Version: 2.2.0
--
-- Rules:
--   Configuration only — no execution data
--   INSERT and UPDATE allowed (config changes)
--   NO DELETE — soft-deactivate via is_active = false
--   Preserves CET referential integrity by value

CREATE TABLE lcs.adapter_registry (
    -- Adapter identity
    adapter_type        TEXT            NOT NULL,   -- unique adapter identifier
    adapter_name        TEXT            NOT NULL,   -- human-readable name

    -- Classification
    channel             TEXT            NOT NULL,   -- delivery channel code
    direction           TEXT            NOT NULL    DEFAULT 'outbound',

    -- Description
    description         TEXT,

    -- Domain rotation (MG adapter only)
    domain_rotation_config JSONB,                   -- e.g., {"domains": ["d1.com", "d2.com"], "rotation_strategy": "round_robin", "daily_cap_per_domain": 150}

    -- Health monitoring
    health_status       TEXT            NOT NULL    DEFAULT 'HEALTHY',
    daily_cap           INT,                        -- max sends per day for this adapter (nullable)
    sent_today          INT             NOT NULL    DEFAULT 0,          -- counter reset daily
    bounce_rate_24h     NUMERIC(5,4)                DEFAULT 0,          -- rolling 24h bounce rate
    complaint_rate_24h  NUMERIC(5,4)                DEFAULT 0,          -- rolling 24h complaint rate
    auto_pause_rules    JSONB,                      -- e.g., {"max_bounce_rate": 0.05, "max_complaint_rate": 0.001, "daily_cap_pause": true}

    -- Status
    is_active           BOOLEAN         NOT NULL    DEFAULT TRUE,

    -- Metadata
    created_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW(),

    -- Constraints
    CONSTRAINT pk_lcs_adapter_registry PRIMARY KEY (adapter_type),
    CONSTRAINT uq_lcs_adapter_name UNIQUE (adapter_name),
    CONSTRAINT chk_adapter_channel CHECK (channel IN ('MG', 'HR', 'SH')),
    CONSTRAINT chk_adapter_direction CHECK (direction IN ('outbound', 'inbound')),
    CONSTRAINT chk_health_status CHECK (health_status IN ('HEALTHY', 'DEGRADED', 'PAUSED', 'WARMING'))
);

COMMENT ON TABLE lcs.adapter_registry IS 'LCS Adapter Registry — declarative catalog of known delivery adapters with domain rotation, health monitoring, and auto-pause rules';
COMMENT ON COLUMN lcs.adapter_registry.channel IS 'Delivery channel code: MG (Mailgun), HR (HeyReach), SH (Sales Handoff)';
COMMENT ON COLUMN lcs.adapter_registry.domain_rotation_config IS 'Domain rotation config for MG adapter. JSON: {domains, rotation_strategy, daily_cap_per_domain}';
COMMENT ON COLUMN lcs.adapter_registry.health_status IS 'Current adapter health: HEALTHY | DEGRADED | PAUSED | WARMING';
COMMENT ON COLUMN lcs.adapter_registry.auto_pause_rules IS 'Auto-pause thresholds. JSON: {max_bounce_rate, max_complaint_rate, daily_cap_pause}';

-- ═══════════════════════════════════════════════════════════════
-- Source: src/sys/lcs/contracts/lcs_signal_queue.schema.sql
-- ═══════════════════════════════════════════════════════════════

-- LCS Signal Queue
-- Classification: QUEUE (transactional, mutable)
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

CREATE INDEX idx_lcs_sq_pending ON lcs.signal_queue (created_at)
    WHERE status = 'PENDING';
CREATE INDEX idx_lcs_sq_company ON lcs.signal_queue (sovereign_company_id);
CREATE INDEX idx_lcs_sq_source ON lcs.signal_queue (source_hub, source_signal_id);

CREATE UNIQUE INDEX idx_lcs_sq_dedup ON lcs.signal_queue (source_hub, source_signal_id)
    WHERE source_signal_id IS NOT NULL AND status = 'PENDING';

COMMENT ON TABLE lcs.signal_queue IS 'LCS Signal Queue — staging table for incoming signals. Bridge functions write PENDING rows, cron runner processes them.';
COMMENT ON COLUMN lcs.signal_queue.source_hub IS 'Which sub-hub originated this signal: PEOPLE, DOL, BLOG, or MANUAL';
COMMENT ON COLUMN lcs.signal_queue.source_signal_id IS 'Traceability back to source pressure_signals.signal_id (by value, not FK)';

-- ═══════════════════════════════════════════════════════════════
-- Section 3: Materialized Views
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- Source: src/sys/lcs/contracts/lcs_latest_by_entity.view.sql
-- ═══════════════════════════════════════════════════════════════

-- LCS Materialized View: Latest Event by Entity
-- Classification: READ-ONLY MATERIALIZED VIEW
-- Version: 2.2.0
--
-- Rules:
--   No logic beyond projection and filtering
--   Fully rebuildable from lcs.event
--   No writes back to base tables
--   Derived strictly from CET
--
-- Refresh schedule: Nightly at 2:30 AM via Supabase cron

CREATE MATERIALIZED VIEW lcs.v_latest_by_entity AS
SELECT DISTINCT ON (entity_type, entity_id)
    communication_id,
    message_run_id,
    sovereign_company_id,
    entity_type,
    entity_id,
    signal_set_hash,
    frame_id,
    adapter_type,
    lifecycle_phase,
    event_type,
    lane,
    delivery_status,
    channel,
    agent_number,
    intelligence_tier,
    created_at
FROM lcs.event
ORDER BY entity_type, entity_id, created_at DESC;

CREATE UNIQUE INDEX idx_lcs_latest_by_entity
    ON lcs.v_latest_by_entity (entity_type, entity_id);

CREATE INDEX idx_lcs_latest_by_entity_company
    ON lcs.v_latest_by_entity (sovereign_company_id);

COMMENT ON MATERIALIZED VIEW lcs.v_latest_by_entity IS 'Latest communication event per entity — read-only, fully rebuildable. Refreshed nightly at 2:30 AM.';

-- ═══════════════════════════════════════════════════════════════
-- Source: src/sys/lcs/contracts/lcs_latest_by_company.view.sql
-- ═══════════════════════════════════════════════════════════════

-- LCS Materialized View: Latest Event by Company
-- Classification: READ-ONLY MATERIALIZED VIEW
-- Version: 2.2.0
--
-- Rules:
--   No logic beyond projection and filtering
--   Fully rebuildable from lcs.event
--   No writes back to base tables
--   Derived strictly from CET
--
-- Refresh schedule: Nightly at 2:30 AM via Supabase cron

CREATE MATERIALIZED VIEW lcs.v_latest_by_company AS
SELECT DISTINCT ON (sovereign_company_id)
    communication_id,
    message_run_id,
    sovereign_company_id,
    entity_type,
    entity_id,
    signal_set_hash,
    frame_id,
    adapter_type,
    lifecycle_phase,
    event_type,
    lane,
    delivery_status,
    channel,
    agent_number,
    intelligence_tier,
    created_at
FROM lcs.event
ORDER BY sovereign_company_id, created_at DESC;

CREATE UNIQUE INDEX idx_lcs_latest_by_company
    ON lcs.v_latest_by_company (sovereign_company_id);

CREATE INDEX idx_lcs_latest_by_company_phase
    ON lcs.v_latest_by_company (lifecycle_phase);

COMMENT ON MATERIALIZED VIEW lcs.v_latest_by_company IS 'Latest communication event per company — read-only, fully rebuildable. Refreshed nightly at 2:30 AM.';

-- ═══════════════════════════════════════════════════════════════
-- Source: src/sys/lcs/contracts/lcs_company_intelligence.view.sql
-- ═══════════════════════════════════════════════════════════════

-- LCS Materialized View: Company Intelligence Snapshot
-- Classification: READ-ONLY MATERIALIZED VIEW
-- Version: 2.2.0
--
-- RECONCILED against production Neon schemas (2026-02-12).
-- Source verification: barton-outreach-core/hubs/*/SCHEMA.md
-- People: people.people_master + people.company_slot
-- DOL: outreach.dol (via outreach.outreach)
-- Blog: outreach.blog (via outreach.outreach)
-- Sitemap: company.company_source_urls (lateral aggregate)
-- Agent: NULL placeholder (coverage hub mapping pending)
--
-- Refresh schedule: Nightly at 2:00 AM via Supabase cron

CREATE MATERIALIZED VIEW lcs.v_company_intelligence AS
SELECT
    -- Company identity (from cl.company_identity)
    ci.company_unique_id    AS sovereign_company_id,
    ci.company_name,

    -- Agent assignment
    -- TODO: Join to coverage.v_service_agent_coverage_zips when agent→company mapping is materialized
    NULL::TEXT               AS agent_number,

    -- People sub-hub: CEO slot
    pm_ceo.unique_id         AS ceo_entity_id,
    pm_ceo.full_name         AS ceo_name,
    pm_ceo.email             AS ceo_email,
    pm_ceo.linkedin_url      AS ceo_linkedin_url,
    pm_ceo.last_verified_at  AS ceo_data_fetched_at,

    -- People sub-hub: CFO slot
    pm_cfo.unique_id         AS cfo_entity_id,
    pm_cfo.full_name         AS cfo_name,
    pm_cfo.email             AS cfo_email,
    pm_cfo.linkedin_url      AS cfo_linkedin_url,

    -- People sub-hub: HR slot
    pm_hr.unique_id          AS hr_entity_id,
    pm_hr.full_name          AS hr_name,
    pm_hr.email              AS hr_email,
    pm_hr.linkedin_url       AS hr_linkedin_url,

    -- DOL sub-hub
    od.renewal_month,
    od.outreach_start_month,
    od.filing_present,
    od.carrier               AS carrier_name,
    od.broker_or_advisor,
    od.funding_type,
    CASE
      WHEN od.renewal_month IS NOT NULL THEN
        (MAKE_DATE(
          CASE WHEN od.renewal_month >= EXTRACT(MONTH FROM CURRENT_DATE)::int
            THEN EXTRACT(YEAR FROM CURRENT_DATE)::int
            ELSE EXTRACT(YEAR FROM CURRENT_DATE)::int + 1
          END,
          od.renewal_month,
          1
        ) - CURRENT_DATE)
      ELSE NULL
    END                      AS days_to_renewal,

    -- Blog sub-hub
    ob.context_summary       AS blog_summary,
    ob.source_type           AS blog_source_type,
    ob.source_url            AS blog_source_url,
    ob.context_timestamp     AS blog_context_date,

    -- Sitemap sub-hub
    site.page_count,
    site.has_careers_page,
    site.source_type_count,

    -- Intelligence tier (deterministic)
    CASE
      WHEN pm_ceo.email IS NOT NULL
           AND od.filing_present = true
           AND ob.context_summary IS NOT NULL
           AND site.page_count > 0
      THEN 1  -- Full: all 4 sub-hubs
      WHEN pm_ceo.email IS NOT NULL
           AND od.filing_present = true
           AND (ob.context_summary IS NOT NULL OR site.page_count > 0)
      THEN 2  -- Strong: People + DOL + 1 other
      WHEN pm_ceo.email IS NOT NULL
           AND od.filing_present = true
      THEN 3  -- Core: People + DOL
      WHEN pm_ceo.email IS NOT NULL
      THEN 4  -- Minimal: People only
      ELSE 5  -- Bare: No CEO contact
    END                      AS intelligence_tier,

    -- Freshness timestamps (for context assembler)
    pm_ceo.last_verified_at  AS people_data_fetched_at,
    od.updated_at            AS dol_data_fetched_at,
    ob.created_at            AS blog_data_fetched_at,
    NULL::TIMESTAMPTZ        AS sitemap_data_fetched_at,

    -- Snapshot timestamp
    NOW()                    AS snapshot_at

FROM cl.company_identity ci

-- People: CEO (people.company_slot → people.people_master)
LEFT JOIN people.company_slot cs_ceo
    ON cs_ceo.company_unique_id = ci.company_unique_id::text
    AND cs_ceo.slot_type = 'CEO'
    AND cs_ceo.is_filled = true
LEFT JOIN people.people_master pm_ceo
    ON pm_ceo.unique_id = cs_ceo.person_unique_id

-- People: CFO
LEFT JOIN people.company_slot cs_cfo
    ON cs_cfo.company_unique_id = ci.company_unique_id::text
    AND cs_cfo.slot_type = 'CFO'
    AND cs_cfo.is_filled = true
LEFT JOIN people.people_master pm_cfo
    ON pm_cfo.unique_id = cs_cfo.person_unique_id

-- People: HR
LEFT JOIN people.company_slot cs_hr
    ON cs_hr.company_unique_id = ci.company_unique_id::text
    AND cs_hr.slot_type = 'HR'
    AND cs_hr.is_filled = true
LEFT JOIN people.people_master pm_hr
    ON pm_hr.unique_id = cs_hr.person_unique_id

-- DOL + Blog (via outreach.outreach)
LEFT JOIN outreach.outreach oo
    ON oo.sovereign_id = ci.company_unique_id
LEFT JOIN outreach.dol od
    ON od.outreach_id = oo.outreach_id
LEFT JOIN outreach.blog ob
    ON ob.outreach_id = oo.outreach_id

-- Sitemap (lateral aggregate from company.company_source_urls)
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS page_count,
    bool_or(source_type = 'careers_page') AS has_careers_page,
    COUNT(DISTINCT source_type) AS source_type_count
  FROM company.company_source_urls csu
  WHERE csu.company_unique_id = ci.company_unique_id::text
) site ON true

WHERE ci.final_outcome = 'PASS';

CREATE UNIQUE INDEX idx_lcs_intelligence_company
    ON lcs.v_company_intelligence (sovereign_company_id);

CREATE INDEX idx_lcs_intelligence_agent
    ON lcs.v_company_intelligence (agent_number)
    WHERE agent_number IS NOT NULL;

CREATE INDEX idx_lcs_intelligence_tier
    ON lcs.v_company_intelligence (intelligence_tier);

CREATE INDEX idx_lcs_intelligence_renewal
    ON lcs.v_company_intelligence (days_to_renewal)
    WHERE days_to_renewal IS NOT NULL;

COMMENT ON MATERIALIZED VIEW lcs.v_company_intelligence IS
    'Cross-sub-hub intelligence snapshot — refreshed nightly at 2:00 AM. '
    'LCS reads only. Sub-hubs remain sovereign. '
    'Runtime reads this view — zero cross-schema joins at send time.';

-- ═══════════════════════════════════════════════════════════════
-- Section 4: Functions
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- Source: src/sys/lcs/contracts/lcs_matview_refresh.rpc.sql
-- ═══════════════════════════════════════════════════════════════

-- LCS Matview Refresh RPC Function
-- Version: 2.2.0
--
-- Called by: matview-refresh.ts via supabase.rpc('refresh_lcs_matview')
-- Schedule: Intelligence at 2:00 AM, Entity+Company at 2:30 AM

CREATE OR REPLACE FUNCTION lcs.refresh_lcs_matview(matview_name TEXT)
RETURNS VOID AS $$
BEGIN
    IF matview_name NOT IN (
        'lcs.v_company_intelligence',
        'lcs.v_latest_by_entity',
        'lcs.v_latest_by_company'
    ) THEN
        RAISE EXCEPTION 'Unknown matview: %. Allowed: v_company_intelligence, v_latest_by_entity, v_latest_by_company', matview_name;
    END IF;

    -- CONCURRENTLY requires a UNIQUE INDEX (all 3 matviews have one)
    EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I.%I',
        split_part(matview_name, '.', 1),
        split_part(matview_name, '.', 2)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION lcs.refresh_lcs_matview(TEXT) IS 'Refresh a named LCS matview CONCURRENTLY. Whitelisted to 3 known matviews only.';

-- ═══════════════════════════════════════════════════════════════
-- Section 5: Grants (PostgREST exposure)
-- ═══════════════════════════════════════════════════════════════

GRANT USAGE ON SCHEMA lcs TO service_role, anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA lcs TO service_role;
GRANT INSERT, UPDATE ON lcs.event TO service_role;
GRANT INSERT, UPDATE ON lcs.err0 TO service_role;
GRANT INSERT, UPDATE, DELETE ON lcs.signal_queue TO service_role;
GRANT UPDATE ON lcs.adapter_registry TO service_role;
GRANT EXECUTE ON FUNCTION lcs.refresh_lcs_matview(TEXT) TO service_role;

COMMIT;
