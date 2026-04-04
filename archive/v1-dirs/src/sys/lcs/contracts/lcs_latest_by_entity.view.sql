-- LCS Materialized View: Latest Event by Entity
-- Classification: READ-ONLY MATERIALIZED VIEW
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Version: 2.2.0
--
-- Rules:
--   No logic beyond projection and filtering
--   Fully rebuildable from lcs.event
--   No writes back to base tables
--   Derived strictly from CET
--
-- Refresh schedule: Nightly at 2:30 AM via Supabase cron
-- REFRESH MATERIALIZED VIEW CONCURRENTLY lcs.v_latest_by_entity;

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

-- Index for fast lookups
CREATE UNIQUE INDEX idx_lcs_latest_by_entity
    ON lcs.v_latest_by_entity (entity_type, entity_id);

CREATE INDEX idx_lcs_latest_by_entity_company
    ON lcs.v_latest_by_entity (sovereign_company_id);

COMMENT ON MATERIALIZED VIEW lcs.v_latest_by_entity IS 'Latest communication event per entity — read-only, fully rebuildable. Refreshed nightly at 2:30 AM.';
