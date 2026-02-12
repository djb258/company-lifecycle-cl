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
-- RECONCILED against production Neon schemas (2026-02-12).
-- Source verification: barton-outreach-core/hubs/*/SCHEMA.md
-- People: people.people_master + people.company_slot
-- DOL: outreach.dol (via outreach.outreach)
-- Blog: outreach.blog (via outreach.outreach)
-- Sitemap: company.company_source_urls (lateral aggregate)
-- Agent: NULL placeholder (coverage hub mapping pending)

CREATE MATERIALIZED VIEW lcs.v_company_intelligence AS
SELECT
    -- Company identity (from cl.company_identity)
    ci.company_unique_id    AS sovereign_company_id,
    ci.company_name,

    -- Agent assignment
    -- TODO: Join to coverage.v_service_agent_coverage_zips when agent→company mapping is materialized
    NULL::TEXT               AS agent_number,

    -- ═══ People sub-hub: CEO slot ═══
    pm_ceo.unique_id         AS ceo_entity_id,
    pm_ceo.full_name         AS ceo_name,
    pm_ceo.email             AS ceo_email,
    pm_ceo.linkedin_url      AS ceo_linkedin_url,
    pm_ceo.last_verified_at  AS ceo_data_fetched_at,

    -- ═══ People sub-hub: CFO slot ═══
    pm_cfo.unique_id         AS cfo_entity_id,
    pm_cfo.full_name         AS cfo_name,
    pm_cfo.email             AS cfo_email,
    pm_cfo.linkedin_url      AS cfo_linkedin_url,

    -- ═══ People sub-hub: HR slot ═══
    pm_hr.unique_id          AS hr_entity_id,
    pm_hr.full_name          AS hr_name,
    pm_hr.email              AS hr_email,
    pm_hr.linkedin_url       AS hr_linkedin_url,

    -- ═══ DOL sub-hub ═══
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

    -- ═══ Blog sub-hub ═══
    ob.context_summary       AS blog_summary,
    ob.source_type           AS blog_source_type,
    ob.source_url            AS blog_source_url,
    ob.context_timestamp     AS blog_context_date,

    -- ═══ Sitemap sub-hub ═══
    site.page_count,
    site.has_careers_page,
    site.source_type_count,

    -- ═══ Intelligence tier (deterministic) ═══
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

    -- ═══ Freshness timestamps (for context assembler) ═══
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

-- ═══════════════════════════════════════════════════════════════════
-- Indexes for runtime reads
-- ═══════════════════════════════════════════════════════════════════

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
