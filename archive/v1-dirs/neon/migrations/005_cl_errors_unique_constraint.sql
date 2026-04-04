-- ============================================================================
-- CL.CL_ERRORS UNIQUE CONSTRAINT
-- ============================================================================
-- Purpose: Prevent duplicate error logging for the same company+pass+reason
--
-- Problem: Validation passes were run multiple times, logging duplicate errors
--          (34,532 rows reduced to 17,791 after deduplication - 16,741 duplicates)
--
-- Solution: Add unique constraint to enforce idempotency at the database level
-- ============================================================================

-- Add unique constraint for errors with company_unique_id
-- This prevents the same error from being logged multiple times for a company
ALTER TABLE cl.cl_errors
ADD CONSTRAINT uq_cl_errors_company_pass_reason
UNIQUE (company_unique_id, pass_name, failure_reason_code);

-- Note: NULL company_unique_id values are exempt from this constraint
-- (PostgreSQL treats NULLs as distinct, so multiple NULL rows are allowed)
-- This is correct behavior since pre-mint errors may legitimately have duplicates

-- ============================================================================
-- USAGE GUIDANCE
-- ============================================================================
-- When inserting errors, use ON CONFLICT to handle duplicates gracefully:
--
-- INSERT INTO cl.cl_errors (
--     company_unique_id,
--     lifecycle_run_id,
--     pass_name,
--     failure_reason_code,
--     inputs_snapshot
-- ) VALUES ($1, $2, $3, $4, $5)
-- ON CONFLICT (company_unique_id, pass_name, failure_reason_code)
-- DO NOTHING;
--
-- Or to update the timestamp on re-occurrence:
-- ON CONFLICT (company_unique_id, pass_name, failure_reason_code)
-- DO UPDATE SET
--     lifecycle_run_id = EXCLUDED.lifecycle_run_id,
--     inputs_snapshot = EXCLUDED.inputs_snapshot;
-- ============================================================================
