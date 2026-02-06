-- LCS Materialized View: Latest Event by Company
-- Classification: READ-ONLY MATERIALIZED VIEW
-- Authority: HUB-CL-001
-- Version: 0.1.0
--
-- Rules:
--   No logic beyond projection and filtering
--   Fully rebuildable from lcs.event
--   No writes back to base tables
--   Derived strictly from CET

CREATE MATERIALIZED VIEW lcs.v_latest_by_company AS
SELECT DISTINCT ON (sovereign_company_id)
    communication_id,
    process_id,
    sovereign_company_id,
    entity_type,
    entity_id,
    signal_set_hash,
    frame_id,
    adapter_type,
    lifecycle_phase,
    status,
    created_at
FROM lcs.event
ORDER BY sovereign_company_id, created_at DESC;

-- Index for fast lookups
CREATE UNIQUE INDEX idx_lcs_latest_by_company
    ON lcs.v_latest_by_company (sovereign_company_id);

CREATE INDEX idx_lcs_latest_by_company_phase
    ON lcs.v_latest_by_company (lifecycle_phase);

COMMENT ON MATERIALIZED VIEW lcs.v_latest_by_company IS 'Latest communication event per company — read-only, fully rebuildable';

-- Refresh command (do not auto-schedule — [[TBD_BY_HUMAN: define refresh cadence]])
-- REFRESH MATERIALIZED VIEW CONCURRENTLY lcs.v_latest_by_company;
