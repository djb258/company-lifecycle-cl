-- LCS Signal Bridge Function
-- Classification: SCHEDULED FUNCTION (read sub-hubs, write signal_queue)
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Version: 2.2.0
--
-- What triggers this? pg_cron every 15 minutes during business hours.
-- How do we get it? Reads pressure_signals from people/dol/blog sub-hubs.
--
-- DOCTRINE: LCS reads sub-hub data. LCS never writes to sub-hub tables.
--   This function writes ONLY to lcs.signal_queue.
--   Sub-hubs remain sovereign — this is a one-way data bridge.

CREATE OR REPLACE FUNCTION lcs.bridge_pressure_signals()
RETURNS TABLE (
    source_hub TEXT,
    signals_found INT,
    signals_inserted INT,
    signals_skipped INT
) AS $$
DECLARE
    v_people_found INT := 0;
    v_people_inserted INT := 0;
    v_dol_found INT := 0;
    v_dol_inserted INT := 0;
    v_blog_found INT := 0;
    v_blog_inserted INT := 0;
BEGIN

    -- ═══ PEOPLE SUB-HUB ═══════════════════════════════════
    WITH people_signals AS (
        SELECT
            ps.signal_id,
            ci.company_unique_id AS sovereign_company_id,
            ps.signal_type,
            ps.magnitude,
            ps.expires_at,
            jsonb_build_object(
                'signal_type', ps.signal_type,
                'magnitude', ps.magnitude,
                'pressure_domain', ps.pressure_domain
            ) AS signal_data
        FROM people.pressure_signals ps
        JOIN cl.company_identity ci
            ON ci.company_unique_id::text = ps.company_unique_id
        WHERE ci.final_outcome = 'PASS'
          AND ps.expires_at > NOW()
          -- Only bridge signals not already in queue
          AND NOT EXISTS (
              SELECT 1 FROM lcs.signal_queue sq
              WHERE sq.source_hub = 'PEOPLE'
                AND sq.source_signal_id = ps.signal_id
                AND sq.status IN ('PENDING', 'COMPLETED')
          )
    ),
    people_insert AS (
        INSERT INTO lcs.signal_queue (
            signal_set_hash, signal_category,
            sovereign_company_id, lifecycle_phase,
            signal_data, source_hub, source_signal_id,
            status, priority
        )
        SELECT
            'SIG-GROWTH-SIGNAL-V1',
            'GROWTH_SIGNAL',
            sovereign_company_id,
            'OUTREACH',
            signal_data,
            'PEOPLE',
            signal_id,
            'PENDING',
            CASE
                WHEN magnitude >= 8 THEN 2  -- high priority
                WHEN magnitude >= 5 THEN 1  -- normal priority
                ELSE 0                       -- low priority
            END
        FROM people_signals
        ON CONFLICT (source_hub, source_signal_id)
            WHERE source_signal_id IS NOT NULL AND status = 'PENDING'
            DO NOTHING
        RETURNING 1
    )
    SELECT
        (SELECT count(*) FROM people_signals),
        (SELECT count(*) FROM people_insert)
    INTO v_people_found, v_people_inserted;

    -- ═══ DOL SUB-HUB ══════════════════════════════════════
    WITH dol_signals AS (
        SELECT
            ps.signal_id,
            ci.company_unique_id AS sovereign_company_id,
            ps.signal_type,
            ps.magnitude,
            ps.expires_at,
            jsonb_build_object(
                'signal_type', ps.signal_type,
                'magnitude', ps.magnitude,
                'pressure_domain', ps.pressure_domain
            ) AS signal_data
        FROM dol.pressure_signals ps
        JOIN cl.company_identity ci
            ON ci.company_unique_id::text = ps.company_unique_id
        WHERE ci.final_outcome = 'PASS'
          AND ps.expires_at > NOW()
          AND NOT EXISTS (
              SELECT 1 FROM lcs.signal_queue sq
              WHERE sq.source_hub = 'DOL'
                AND sq.source_signal_id = ps.signal_id
                AND sq.status IN ('PENDING', 'COMPLETED')
          )
    ),
    dol_insert AS (
        INSERT INTO lcs.signal_queue (
            signal_set_hash, signal_category,
            sovereign_company_id, lifecycle_phase,
            signal_data, source_hub, source_signal_id,
            status, priority
        )
        SELECT
            CASE
                WHEN signal_type = 'renewal_proximity' THEN 'SIG-RENEWAL-PROXIMITY-V1'
                ELSE 'SIG-PLAN-CHANGE-V1'
            END,
            CASE
                WHEN signal_type = 'renewal_proximity' THEN 'RENEWAL_PROXIMITY'
                ELSE 'PLAN_CHANGE'
            END,
            sovereign_company_id,
            'OUTREACH',
            signal_data,
            'DOL',
            signal_id,
            'PENDING',
            CASE
                WHEN magnitude >= 8 THEN 2
                WHEN magnitude >= 5 THEN 1
                ELSE 0
            END
        FROM dol_signals
        ON CONFLICT (source_hub, source_signal_id)
            WHERE source_signal_id IS NOT NULL AND status = 'PENDING'
            DO NOTHING
        RETURNING 1
    )
    SELECT
        (SELECT count(*) FROM dol_signals),
        (SELECT count(*) FROM dol_insert)
    INTO v_dol_found, v_dol_inserted;

    -- ═══ BLOG SUB-HUB ═════════════════════════════════════
    -- Conditional: blog.pressure_signals may not exist yet
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'blog' AND table_name = 'pressure_signals'
    ) THEN
        WITH blog_signals AS (
            SELECT
                ps.signal_id,
                ci.company_unique_id AS sovereign_company_id,
                ps.signal_type,
                ps.magnitude,
                ps.expires_at,
                jsonb_build_object(
                    'signal_type', ps.signal_type,
                    'magnitude', ps.magnitude,
                    'pressure_domain', ps.pressure_domain
                ) AS signal_data
            FROM blog.pressure_signals ps
            JOIN cl.company_identity ci
                ON ci.company_unique_id::text = ps.company_unique_id
            WHERE ci.final_outcome = 'PASS'
              AND ps.expires_at > NOW()
              AND NOT EXISTS (
                  SELECT 1 FROM lcs.signal_queue sq
                  WHERE sq.source_hub = 'BLOG'
                    AND sq.source_signal_id = ps.signal_id
                    AND sq.status IN ('PENDING', 'COMPLETED')
              )
        ),
        blog_insert AS (
            INSERT INTO lcs.signal_queue (
                signal_set_hash, signal_category,
                sovereign_company_id, lifecycle_phase,
                signal_data, source_hub, source_signal_id,
                status, priority
            )
            SELECT
                'SIG-BLOG-TRIGGER-V1',
                'BLOG_TRIGGER',
                sovereign_company_id,
                'OUTREACH',
                signal_data,
                'BLOG',
                signal_id,
                'PENDING',
                CASE
                    WHEN magnitude >= 8 THEN 2
                    WHEN magnitude >= 5 THEN 1
                    ELSE 0
                END
            FROM blog_signals
            ON CONFLICT (source_hub, source_signal_id)
                WHERE source_signal_id IS NOT NULL AND status = 'PENDING'
                DO NOTHING
            RETURNING 1
        )
        SELECT
            (SELECT count(*) FROM blog_signals),
            (SELECT count(*) FROM blog_insert)
        INTO v_blog_found, v_blog_inserted;
    END IF;

    -- ═══ RETURN RESULTS ═══════════════════════════════════
    RETURN QUERY SELECT
        'PEOPLE'::TEXT, v_people_found, v_people_inserted, (v_people_found - v_people_inserted);
    RETURN QUERY SELECT
        'DOL'::TEXT, v_dol_found, v_dol_inserted, (v_dol_found - v_dol_inserted);
    RETURN QUERY SELECT
        'BLOG'::TEXT, v_blog_found, v_blog_inserted, (v_blog_found - v_blog_inserted);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION lcs.bridge_pressure_signals() IS
    'Bridges unexpired pressure_signals from people/dol/blog sub-hubs into lcs.signal_queue. '
    'Read-only on sub-hubs. Idempotent (dedup on source_hub + source_signal_id). '
    'Called by pg_cron every 15 minutes.';
