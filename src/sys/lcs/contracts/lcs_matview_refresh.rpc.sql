-- LCS Matview Refresh RPC Function
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
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

-- Grant to supabase service role (for Edge Function / cron calls)
-- GRANT EXECUTE ON FUNCTION lcs.refresh_lcs_matview(TEXT) TO service_role;
