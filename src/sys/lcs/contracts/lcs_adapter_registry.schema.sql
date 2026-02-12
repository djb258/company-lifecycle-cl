-- LCS Adapter Registry
-- Classification: REGISTRY (configuration only)
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
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

-- Comments
COMMENT ON TABLE lcs.adapter_registry IS 'LCS Adapter Registry — declarative catalog of known delivery adapters with domain rotation, health monitoring, and auto-pause rules';
COMMENT ON COLUMN lcs.adapter_registry.channel IS 'Delivery channel code: MG (Mailgun), HR (HeyReach), SH (Sales Handoff)';
COMMENT ON COLUMN lcs.adapter_registry.domain_rotation_config IS 'Domain rotation config for MG adapter. JSON: {domains, rotation_strategy, daily_cap_per_domain}';
COMMENT ON COLUMN lcs.adapter_registry.health_status IS 'Current adapter health: HEALTHY | DEGRADED | PAUSED | WARMING';
COMMENT ON COLUMN lcs.adapter_registry.auto_pause_rules IS 'Auto-pause thresholds. JSON: {max_bounce_rate, max_complaint_rate, daily_cap_pause}';
