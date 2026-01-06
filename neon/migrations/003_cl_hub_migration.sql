-- ============================================================================
-- HUB 1: COMPANY_CL MIGRATION
-- ============================================================================
-- Purpose: Complete sovereign identity hub (single table approach)
-- This migration handles CL only. Outreach/Sales/Client are in separate repos.
--
-- What this does:
-- 1. Ensures all required columns exist on company_identity
-- 2. Syncs identity_status with existence_verified (PASS/FAIL)
-- 3. Creates eligibility views
-- 4. Prepares for downstream handoff
-- ============================================================================

-- ============================================================================
-- ENSURE REQUIRED COLUMNS
-- ============================================================================
ALTER TABLE cl.company_identity ADD COLUMN IF NOT EXISTS canonical_name TEXT;
ALTER TABLE cl.company_identity ADD COLUMN IF NOT EXISTS state_verified TEXT;
ALTER TABLE cl.company_identity ADD COLUMN IF NOT EXISTS employee_count_band TEXT;
ALTER TABLE cl.company_identity ADD COLUMN IF NOT EXISTS company_fingerprint TEXT;
ALTER TABLE cl.company_identity ADD COLUMN IF NOT EXISTS lifecycle_run_id TEXT;
ALTER TABLE cl.company_identity ADD COLUMN IF NOT EXISTS identity_pass INT DEFAULT 0;
ALTER TABLE cl.company_identity ADD COLUMN IF NOT EXISTS identity_status TEXT DEFAULT 'PENDING';
ALTER TABLE cl.company_identity ADD COLUMN IF NOT EXISTS last_pass_at TIMESTAMPTZ;
ALTER TABLE cl.company_identity ADD COLUMN IF NOT EXISTS existence_verified BOOLEAN;
ALTER TABLE cl.company_identity ADD COLUMN IF NOT EXISTS name_match_score INT;
ALTER TABLE cl.company_identity ADD COLUMN IF NOT EXISTS state_match_result TEXT;

-- ============================================================================
-- STATUS CONSTRAINT
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'cl_identity_status_check'
    ) THEN
        ALTER TABLE cl.company_identity
        ADD CONSTRAINT cl_identity_status_check
        CHECK (identity_status IN ('PENDING', 'PASS', 'FAIL'));
    END IF;
END $$;

-- ============================================================================
-- INDEXES FOR GATE QUERIES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_cl_identity_status ON cl.company_identity(identity_status);
CREATE INDEX IF NOT EXISTS idx_cl_identity_pass ON cl.company_identity(identity_pass);
CREATE INDEX IF NOT EXISTS idx_cl_identity_existence ON cl.company_identity(existence_verified);

-- ============================================================================
-- STATUS SYNC: Align identity_status with existence_verified
-- ============================================================================
-- PASS where existence_verified = TRUE
-- FAIL where existence_verified = FALSE

UPDATE cl.company_identity
SET identity_status = 'PASS'
WHERE existence_verified = TRUE
  AND (identity_status IS NULL OR identity_status = 'PENDING');

UPDATE cl.company_identity
SET identity_status = 'FAIL'
WHERE existence_verified = FALSE
  AND (identity_status IS NULL OR identity_status = 'PENDING');

-- ============================================================================
-- ELIGIBILITY VIEW
-- ============================================================================
DROP VIEW IF EXISTS cl.v_company_identity_eligible CASCADE;

CREATE VIEW cl.v_company_identity_eligible AS
SELECT
    ci.*,

    -- Canonical eligibility: status = 'PASS' gates flow
    CASE
        WHEN ci.identity_status = 'PASS' THEN TRUE
        ELSE FALSE
    END AS eligible_for_outreach,

    -- Eligibility reason for debugging
    CASE
        WHEN ci.identity_status = 'PASS' THEN 'PASS'
        WHEN ci.identity_status = 'PENDING' THEN 'PENDING'
        WHEN ci.identity_status = 'FAIL' THEN 'FAIL'
        ELSE 'UNKNOWN'
    END AS eligibility_reason,

    -- Informational flags (NOT gates)
    ci.existence_verified AS domain_verified,
    CASE WHEN ci.name_match_score >= 70 THEN TRUE ELSE FALSE END AS name_coherent,
    CASE WHEN ci.state_match_result = 'PASS' THEN TRUE ELSE FALSE END AS state_coherent

FROM cl.company_identity ci;

COMMENT ON VIEW cl.v_company_identity_eligible IS
'Canonical eligibility contract for downstream consumption.
DOCTRINE: eligible_for_outreach = (identity_status = ''PASS'')
Sovereign ID is generated at insert but official only when status = PASS.
Downstream systems (Outreach) must check this view before accepting companies.';

-- ============================================================================
-- SUMMARY VIEW
-- ============================================================================
DROP VIEW IF EXISTS cl.v_identity_gate_summary;

CREATE VIEW cl.v_identity_gate_summary AS
SELECT
    COUNT(*) AS total_companies,
    COUNT(*) FILTER (WHERE identity_status = 'PASS') AS pass_count,
    COUNT(*) FILTER (WHERE identity_status = 'PENDING') AS pending_count,
    COUNT(*) FILTER (WHERE identity_status = 'FAIL') AS fail_count,
    ROUND(100.0 * COUNT(*) FILTER (WHERE identity_status = 'PASS') / NULLIF(COUNT(*), 0), 2) AS pass_pct
FROM cl.company_identity;

COMMENT ON VIEW cl.v_identity_gate_summary IS
'Summary statistics for identity gate. Use for monitoring dashboards.';

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================
COMMENT ON TABLE cl.company_identity IS
'Hub 1: Sovereign identity table (single table approach).
- Raw intake enters with status=PENDING
- sovereign_id (company_unique_id) generated at insert
- Validation runs, status becomes PASS (minted) or FAIL (error logged)
- Doctrine: sovereign_id is official only when status=PASS
- Downstream systems must check identity_status before accepting';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run after migration:
-- SELECT * FROM cl.v_identity_gate_summary;
