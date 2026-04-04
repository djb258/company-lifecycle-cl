-- ============================================================================
-- BLOAT TABLE REMOVAL
-- ============================================================================
-- Purpose: Remove v1 tables replaced by v2 lean schema
-- WARNING: This is destructive. Run 003_hub_reorganization.sql first.
--
-- Tables being dropped:
-- - V1 error tables (replaced by unified cl.cl_errors)
-- - V1 sidecar tables (replaced by cl.company_names, cl.company_domains)
-- - Staging table (no longer needed with single table approach)
-- - Other deprecated tables
--
-- PRESERVED TABLES (NOT dropped):
-- - cl.company_candidate (intake audit log with raw payloads)
-- - cl.company_identity (core sovereign identity)
-- - cl.company_identity_bridge (join surface)
-- - cl.identity_confidence (confidence envelope)
-- - cl.company_names (v2 sidecar)
-- - cl.company_domains (v2 sidecar)
-- - cl.cl_errors (unified errors)
-- - cl.identity_gate_audit (audit log)
-- - cl.identity_gate_failures (gate failures)
-- ============================================================================

-- Safety check: Verify CL migration ran before dropping old tables
DO $$
BEGIN
    -- Check that identity_status column exists (added by 003_cl_hub_migration.sql)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'cl'
          AND table_name = 'company_identity'
          AND column_name = 'identity_status'
    ) THEN
        RAISE EXCEPTION 'identity_status column not found. Run 003_cl_hub_migration.sql first.';
    END IF;

    -- Check that eligibility view exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'cl'
          AND table_name = 'v_company_identity_eligible'
    ) THEN
        RAISE EXCEPTION 'v_company_identity_eligible view not found. Run 003_cl_hub_migration.sql first.';
    END IF;
END $$;

-- ============================================================================
-- DROP V1 ERROR TABLES (replaced by cl.cl_errors)
-- ============================================================================
DROP TABLE IF EXISTS cl.cl_errors_existence CASCADE;
DROP TABLE IF EXISTS cl.cl_errors_name CASCADE;
DROP TABLE IF EXISTS cl.cl_errors_domain CASCADE;
DROP TABLE IF EXISTS cl.cl_errors_collision CASCADE;
DROP TABLE IF EXISTS cl.cl_errors_firmographic CASCADE;

-- ============================================================================
-- DROP V1 SIDECAR TABLES (replaced by cl.company_names, cl.company_domains)
-- ============================================================================
DROP TABLE IF EXISTS cl.company_aliases CASCADE;
DROP TABLE IF EXISTS cl.domain_facts CASCADE;

-- ============================================================================
-- DROP DEPRECATED TABLES
-- ============================================================================
DROP TABLE IF EXISTS cl.identity_collisions CASCADE;
DROP TABLE IF EXISTS cl.funnel_runs CASCADE;
DROP TABLE IF EXISTS cl.company_lifecycle_error CASCADE;

-- ============================================================================
-- DROP STAGING TABLE (single table approach - no longer needed)
-- ============================================================================
-- NOTE: If you have data in staging that needs migration, do that BEFORE running this.
-- This migration assumes all staging data has been processed.

-- First, check if there's unprocessed data
DO $$
DECLARE
    staging_count INT;
BEGIN
    SELECT COUNT(*) INTO staging_count
    FROM information_schema.tables
    WHERE table_schema = 'cl' AND table_name = 'company_lifecycle_identity_staging';

    IF staging_count > 0 THEN
        EXECUTE 'SELECT COUNT(*) FROM cl.company_lifecycle_identity_staging' INTO staging_count;
        IF staging_count > 0 THEN
            RAISE WARNING 'Staging table has % unprocessed rows. Review before dropping.', staging_count;
        END IF;
    END IF;
END $$;

DROP TABLE IF EXISTS cl.company_lifecycle_identity_staging CASCADE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- List remaining CL tables (should be lean set)
-- SELECT table_schema, table_name
-- FROM information_schema.tables
-- WHERE table_schema IN ('cl', 'outreach', 'sales', 'client')
-- ORDER BY table_schema, table_name;

-- Expected remaining tables:
-- cl.company_identity (core)
-- cl.company_names (sidecar)
-- cl.company_domains (sidecar)
-- cl.cl_errors (unified errors)
-- cl.identity_confidence (envelope)
-- cl.identity_gate_audit (audit log)
-- cl.identity_gate_failures (gate failures)
-- cl.company_identity_bridge (join surface)
-- outreach.outreach (master)
-- outreach.company_target (sub-hub)
-- outreach.dol (sub-hub)
-- outreach.outreach_people (sub-hub)
-- outreach.blog (sub-hub)
-- sales.opportunity (shell)
-- client.client (shell)
