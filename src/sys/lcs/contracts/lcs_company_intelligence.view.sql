-- LCS Materialized View: Company Intelligence Snapshot
-- Classification: READ-ONLY MATERIALIZED VIEW
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Version: 2.2.0
--
-- Purpose: Pre-assembled cross-sub-hub intelligence snapshot.
--   Eliminates 60K+ runtime queries by pre-joining People, DOL, Blog, Sitemap.
--   Morning batch reads from this view only — zero runtime cross-schema joins.
--
-- Refresh: Nightly at 2:00 AM via Supabase cron (CONCURRENTLY)
-- Doctrine: LCS reads sub-hub data. LCS never writes to sub-hub tables.
--   This matview is a read-only snapshot. Sub-hubs remain sovereign.
--
-- IMPORTANT: Cross-schema table/column references below are PLACEHOLDER REFERENCES.
--   The sub-hub schemas (people, dol, blog, sitemap, coverage) are defined in
--   separate repositories and do not exist in this repo. All [[VERIFY]] markers
--   must be resolved against the actual sub-hub schemas before deployment.

CREATE MATERIALIZED VIEW lcs.v_company_intelligence AS
SELECT
    -- Company identity (from cl.company_identity — VERIFIED in this repo)
    ci.company_unique_id    AS sovereign_company_id,  -- cl PK mapped to LCS naming convention
    ci.company_name,
    -- [[VERIFY: agent_number does not exist on cl.company_identity — must come from coverage.agent_assignment or be added to CL]]
    NULL::TEXT               AS agent_number,          -- placeholder until coverage model is available

    -- People sub-hub: CEO slot [[VERIFY: actual table is people.entity with columns as shown]]
    p_ceo.entity_id          AS ceo_entity_id,         -- [[VERIFY: people.entity.entity_id]]
    p_ceo.full_name           AS ceo_name,              -- [[VERIFY: people.entity.full_name]]
    p_ceo.email               AS ceo_email,             -- [[VERIFY: people.entity.email]]
    p_ceo.linkedin_url        AS ceo_linkedin_url,      -- [[VERIFY: people.entity.linkedin_url]]
    p_ceo.data_fetched_at     AS ceo_data_fetched_at,   -- [[VERIFY: people.entity.data_fetched_at]]

    -- People sub-hub: CFO slot [[VERIFY: same table, different slot_type]]
    p_cfo.entity_id          AS cfo_entity_id,
    p_cfo.full_name           AS cfo_name,
    p_cfo.email               AS cfo_email,
    p_cfo.linkedin_url        AS cfo_linkedin_url,

    -- People sub-hub: HR slot [[VERIFY: same table, different slot_type]]
    p_hr.entity_id           AS hr_entity_id,
    p_hr.full_name            AS hr_name,
    p_hr.email                AS hr_email,
    p_hr.linkedin_url         AS hr_linkedin_url,

    -- DOL sub-hub [[VERIFY: actual table name, column names]]
    dol.plan_year_end,                                  -- [[VERIFY: dol.filing.plan_year_end]]
    dol.total_participants,                              -- [[VERIFY: dol.filing.total_participants]]
    dol.total_plan_cost,                                 -- [[VERIFY: dol.filing.total_plan_cost]]
    dol.carrier_name,                                    -- [[VERIFY: dol.filing.carrier_name]]
    (dol.plan_year_end - CURRENT_DATE) AS days_to_renewal,

    -- Blog sub-hub [[VERIFY: actual table name, column names]]
    blog.latest_post_title,                              -- [[VERIFY: blog.company_summary.latest_post_title]]
    blog.latest_post_date,                               -- [[VERIFY: blog.company_summary.latest_post_date]]
    blog.post_count,                                     -- [[VERIFY: blog.company_summary.post_count]]

    -- Sitemap sub-hub [[VERIFY: actual table name, column names]]
    site.page_count,                                     -- [[VERIFY: sitemap.company_summary.page_count]]
    site.has_careers_page,                                -- [[VERIFY: sitemap.company_summary.has_careers_page]]
    site.location_count,                                  -- [[VERIFY: sitemap.company_summary.location_count]]

    -- Computed intelligence tier (deterministic)
    CASE
        WHEN p_ceo.email IS NOT NULL
             AND dol.plan_year_end IS NOT NULL
             AND blog.post_count > 0
             AND site.page_count IS NOT NULL
        THEN 1  -- Full intelligence: all 4 sub-hubs have data
        WHEN p_ceo.email IS NOT NULL
             AND dol.plan_year_end IS NOT NULL
             AND (blog.post_count > 0 OR site.page_count IS NOT NULL)
        THEN 2  -- Strong: People + DOL + 1 other
        WHEN p_ceo.email IS NOT NULL
             AND dol.plan_year_end IS NOT NULL
        THEN 3  -- Core: People + DOL only
        WHEN p_ceo.email IS NOT NULL
        THEN 4  -- Minimal: People only (has contact, no DOL)
        ELSE 5  -- Bare: No CEO contact found
    END AS intelligence_tier,

    -- Snapshot timestamp
    NOW() AS snapshot_at

FROM cl.company_identity ci

-- People: CEO [[VERIFY: people.entity table, slot_type column, is_active column]]
LEFT JOIN people.entity p_ceo
    ON p_ceo.sovereign_company_id = ci.company_unique_id
    AND p_ceo.slot_type = 'CEO'
    AND p_ceo.is_active = true

-- People: CFO [[VERIFY: same table]]
LEFT JOIN people.entity p_cfo
    ON p_cfo.sovereign_company_id = ci.company_unique_id
    AND p_cfo.slot_type = 'CFO'
    AND p_cfo.is_active = true

-- People: HR [[VERIFY: same table]]
LEFT JOIN people.entity p_hr
    ON p_hr.sovereign_company_id = ci.company_unique_id
    AND p_hr.slot_type = 'HR'
    AND p_hr.is_active = true

-- DOL [[VERIFY: dol.filing table, is_latest column, sovereign_company_id join column]]
LEFT JOIN dol.filing dol
    ON dol.sovereign_company_id = ci.company_unique_id
    AND dol.is_latest = true

-- Blog [[VERIFY: blog.company_summary table, sovereign_company_id join column]]
LEFT JOIN blog.company_summary blog
    ON blog.sovereign_company_id = ci.company_unique_id

-- Sitemap [[VERIFY: sitemap.company_summary table, sovereign_company_id join column]]
LEFT JOIN sitemap.company_summary site
    ON site.sovereign_company_id = ci.company_unique_id

-- [[VERIFY: cl.company_identity does not have a lifecycle_stage column.
--   The prompt references WHERE ci.lifecycle_stage != 'DEAD' but this column
--   does not exist. CL uses identity_status (PENDING/PASS/FAIL) and
--   final_outcome (PASS/FAIL). Adjust filter when column mapping is confirmed.]]
WHERE ci.final_outcome = 'PASS';

-- Indexes for runtime reads
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

-- Refresh schedule: Nightly at 2:00 AM via Supabase cron
-- REFRESH MATERIALIZED VIEW CONCURRENTLY lcs.v_company_intelligence;
