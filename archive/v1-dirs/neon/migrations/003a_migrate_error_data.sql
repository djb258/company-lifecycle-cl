-- ============================================================================
-- ERROR DATA MIGRATION
-- ============================================================================
-- Purpose: Migrate error data from v1 tables to unified cl.cl_errors
-- MUST RUN BEFORE 004_drop_bloat_tables.sql
--
-- This preserves:
-- - cl.cl_err_existence (7,985+ records)
-- - Any other v1 error tables that have data
-- ============================================================================

-- Ensure unified error table exists
CREATE TABLE IF NOT EXISTS cl.cl_errors (
    error_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_unique_id UUID,
    lifecycle_run_id TEXT NOT NULL,
    pass_name TEXT NOT NULL CHECK (pass_name IN ('existence', 'name', 'domain', 'collision', 'firmographic')),
    failure_reason_code TEXT NOT NULL,
    inputs_snapshot JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_errors_pass ON cl.cl_errors(pass_name);
CREATE INDEX IF NOT EXISTS idx_errors_run ON cl.cl_errors(lifecycle_run_id);
CREATE INDEX IF NOT EXISTS idx_errors_unresolved ON cl.cl_errors(resolved_at) WHERE resolved_at IS NULL;

-- ============================================================================
-- MIGRATE EXISTENCE ERRORS
-- ============================================================================
DO $$
DECLARE
    v_count INT;
    v_migrated INT := 0;
BEGIN
    -- Check if source table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'cl' AND table_name = 'cl_err_existence'
    ) THEN
        -- Count existing records
        EXECUTE 'SELECT COUNT(*) FROM cl.cl_err_existence' INTO v_count;
        RAISE NOTICE 'Found % records in cl.cl_err_existence', v_count;

        -- Migrate if not empty
        IF v_count > 0 THEN
            INSERT INTO cl.cl_errors (
                company_unique_id,
                lifecycle_run_id,
                pass_name,
                failure_reason_code,
                inputs_snapshot,
                created_at,
                resolved_at
            )
            SELECT
                company_unique_id,
                COALESCE(verification_run_id, 'LEGACY-MIGRATION'),
                'existence',
                COALESCE(reason_code, 'EXISTENCE_FAIL'),
                jsonb_build_object(
                    'domain', company_domain,
                    'company_name', company_name,
                    'domain_status_code', domain_status_code,
                    'domain_error', domain_error,
                    'name_match_score', name_match_score,
                    'state_match_result', state_match_result,
                    'evidence', evidence,
                    'source_table', 'cl_err_existence'
                ),
                COALESCE(created_at, now()),
                NULL
            FROM cl.cl_err_existence
            ON CONFLICT DO NOTHING;

            GET DIAGNOSTICS v_migrated = ROW_COUNT;
            RAISE NOTICE 'Migrated % existence errors to cl.cl_errors', v_migrated;
        END IF;
    ELSE
        RAISE NOTICE 'cl.cl_err_existence does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- MIGRATE NAME ERRORS
-- ============================================================================
DO $$
DECLARE
    v_count INT;
    v_migrated INT := 0;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'cl' AND table_name = 'cl_errors_name'
    ) THEN
        EXECUTE 'SELECT COUNT(*) FROM cl.cl_errors_name' INTO v_count;
        RAISE NOTICE 'Found % records in cl.cl_errors_name', v_count;

        IF v_count > 0 THEN
            INSERT INTO cl.cl_errors (
                company_unique_id,
                lifecycle_run_id,
                pass_name,
                failure_reason_code,
                inputs_snapshot,
                created_at,
                resolved_at
            )
            SELECT
                company_unique_id,
                COALESCE(lifecycle_run_id, 'LEGACY-MIGRATION'),
                'name',
                COALESCE(failure_reason, 'NAME_FAIL'),
                jsonb_build_object('source_table', 'cl_errors_name'),
                COALESCE(created_at, now()),
                NULL
            FROM cl.cl_errors_name
            ON CONFLICT DO NOTHING;

            GET DIAGNOSTICS v_migrated = ROW_COUNT;
            RAISE NOTICE 'Migrated % name errors to cl.cl_errors', v_migrated;
        END IF;
    ELSE
        RAISE NOTICE 'cl.cl_errors_name does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- MIGRATE DOMAIN ERRORS
-- ============================================================================
DO $$
DECLARE
    v_count INT;
    v_migrated INT := 0;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'cl' AND table_name = 'cl_errors_domain'
    ) THEN
        EXECUTE 'SELECT COUNT(*) FROM cl.cl_errors_domain' INTO v_count;
        RAISE NOTICE 'Found % records in cl.cl_errors_domain', v_count;

        IF v_count > 0 THEN
            INSERT INTO cl.cl_errors (
                company_unique_id,
                lifecycle_run_id,
                pass_name,
                failure_reason_code,
                inputs_snapshot,
                created_at,
                resolved_at
            )
            SELECT
                company_unique_id,
                COALESCE(lifecycle_run_id, 'LEGACY-MIGRATION'),
                'domain',
                COALESCE(failure_reason, 'DOMAIN_FAIL'),
                jsonb_build_object('source_table', 'cl_errors_domain'),
                COALESCE(created_at, now()),
                NULL
            FROM cl.cl_errors_domain
            ON CONFLICT DO NOTHING;

            GET DIAGNOSTICS v_migrated = ROW_COUNT;
            RAISE NOTICE 'Migrated % domain errors to cl.cl_errors', v_migrated;
        END IF;
    ELSE
        RAISE NOTICE 'cl.cl_errors_domain does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- MIGRATE COLLISION ERRORS
-- ============================================================================
DO $$
DECLARE
    v_count INT;
    v_migrated INT := 0;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'cl' AND table_name = 'cl_errors_collision'
    ) THEN
        EXECUTE 'SELECT COUNT(*) FROM cl.cl_errors_collision' INTO v_count;
        RAISE NOTICE 'Found % records in cl.cl_errors_collision', v_count;

        IF v_count > 0 THEN
            INSERT INTO cl.cl_errors (
                company_unique_id,
                lifecycle_run_id,
                pass_name,
                failure_reason_code,
                inputs_snapshot,
                created_at,
                resolved_at
            )
            SELECT
                company_unique_id,
                COALESCE(lifecycle_run_id, 'LEGACY-MIGRATION'),
                'collision',
                COALESCE(failure_reason, 'COLLISION_FAIL'),
                jsonb_build_object('source_table', 'cl_errors_collision'),
                COALESCE(created_at, now()),
                NULL
            FROM cl.cl_errors_collision
            ON CONFLICT DO NOTHING;

            GET DIAGNOSTICS v_migrated = ROW_COUNT;
            RAISE NOTICE 'Migrated % collision errors to cl.cl_errors', v_migrated;
        END IF;
    ELSE
        RAISE NOTICE 'cl.cl_errors_collision does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- MIGRATE FIRMOGRAPHIC ERRORS
-- ============================================================================
DO $$
DECLARE
    v_count INT;
    v_migrated INT := 0;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'cl' AND table_name = 'cl_errors_firmographic'
    ) THEN
        EXECUTE 'SELECT COUNT(*) FROM cl.cl_errors_firmographic' INTO v_count;
        RAISE NOTICE 'Found % records in cl.cl_errors_firmographic', v_count;

        IF v_count > 0 THEN
            INSERT INTO cl.cl_errors (
                company_unique_id,
                lifecycle_run_id,
                pass_name,
                failure_reason_code,
                inputs_snapshot,
                created_at,
                resolved_at
            )
            SELECT
                company_unique_id,
                COALESCE(lifecycle_run_id, 'LEGACY-MIGRATION'),
                'firmographic',
                COALESCE(failure_reason, 'FIRMOGRAPHIC_FAIL'),
                jsonb_build_object('source_table', 'cl_errors_firmographic'),
                COALESCE(created_at, now()),
                NULL
            FROM cl.cl_errors_firmographic
            ON CONFLICT DO NOTHING;

            GET DIAGNOSTICS v_migrated = ROW_COUNT;
            RAISE NOTICE 'Migrated % firmographic errors to cl.cl_errors', v_migrated;
        END IF;
    ELSE
        RAISE NOTICE 'cl.cl_errors_firmographic does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- MIGRATE LEGACY ERROR TABLE (company_lifecycle_error)
-- ============================================================================
-- NOTE: source_company_id is TEXT format like "04.04.01.49.00049.049", not UUID
-- We store it in inputs_snapshot instead of trying to cast to UUID
DO $$
DECLARE
    v_count INT;
    v_migrated INT := 0;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'cl' AND table_name = 'company_lifecycle_error'
    ) THEN
        EXECUTE 'SELECT COUNT(*) FROM cl.company_lifecycle_error' INTO v_count;
        RAISE NOTICE 'Found % records in cl.company_lifecycle_error', v_count;

        IF v_count > 0 THEN
            INSERT INTO cl.cl_errors (
                company_unique_id,
                lifecycle_run_id,
                pass_name,
                failure_reason_code,
                inputs_snapshot,
                created_at,
                resolved_at
            )
            SELECT
                NULL,  -- source_company_id is not UUID format, store in inputs_snapshot
                COALESCE(lifecycle_run_id, 'LEGACY-MIGRATION'),
                'existence',  -- Map all legacy errors to existence pass (GATE_ZERO_INTAKE -> existence)
                COALESCE(failure_reason, 'LEGACY_FAIL'),
                jsonb_build_object(
                    'source_company_id', source_company_id,
                    'failure_details', failure_details,
                    'source_table', 'company_lifecycle_error'
                ),
                COALESCE(created_at, now()),
                CASE WHEN status = 'RESOLVED' THEN updated_at ELSE NULL END
            FROM cl.company_lifecycle_error
            ON CONFLICT DO NOTHING;

            GET DIAGNOSTICS v_migrated = ROW_COUNT;
            RAISE NOTICE 'Migrated % legacy errors to cl.cl_errors', v_migrated;
        END IF;
    ELSE
        RAISE NOTICE 'cl.company_lifecycle_error does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Count unified errors after migration
DO $$
DECLARE
    v_total INT;
    v_by_pass RECORD;
BEGIN
    SELECT COUNT(*) INTO v_total FROM cl.cl_errors;
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'ERROR MIGRATION COMPLETE';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Total errors in cl.cl_errors: %', v_total;
    RAISE NOTICE '';
    RAISE NOTICE 'Errors by pass:';

    FOR v_by_pass IN
        SELECT pass_name, COUNT(*) as cnt
        FROM cl.cl_errors
        GROUP BY pass_name
        ORDER BY cnt DESC
    LOOP
        RAISE NOTICE '  %: %', v_by_pass.pass_name, v_by_pass.cnt;
    END LOOP;
END $$;
