-- ============================================================================
-- IDENTITY GATE MIGRATION
-- ============================================================================
-- Purpose: Create eligibility contract for downstream consumption
-- Doctrine: existence_verified is INFORMATIONAL ONLY
--           eligible_for_outreach = (identity_pass = 1 AND identity_status = 'PASS')
--
-- This is ADDITIVE ONLY - no existing rows are modified
-- ============================================================================

-- ============================================================================
-- A) ELIGIBILITY VIEW
-- ============================================================================
-- Downstream consumers MUST use this view, not the raw table
-- This view computes eligibility based on identity pass status

DROP VIEW IF EXISTS cl.v_company_identity_eligible;

CREATE VIEW cl.v_company_identity_eligible AS
SELECT
  ci.*,

  -- Canonical eligibility flag
  -- DOCTRINE: identity_pass = 1 AND identity_status = 'PASS' unlocks downstream
  -- existence_verified is INFORMATIONAL ONLY
  CASE
    WHEN ci.identity_pass >= 1 AND ci.identity_status = 'PASS' THEN TRUE
    ELSE FALSE
  END AS eligible_for_outreach,

  -- Eligibility reason for debugging/auditing
  CASE
    WHEN ci.identity_pass >= 1 AND ci.identity_status = 'PASS' THEN 'PASS'
    WHEN ci.identity_status = 'PENDING' THEN 'PENDING'
    WHEN ci.identity_status = 'FAIL' AND ci.state_match_result = 'HARD_FAIL' THEN 'FAIL_STATE'
    WHEN ci.identity_status = 'FAIL' AND ci.name_match_score < 40 THEN 'FAIL_NAME'
    WHEN ci.existence_verified = FALSE THEN 'FAIL_DOMAIN'
    ELSE 'UNKNOWN'
  END AS eligibility_reason,

  -- Informational flags (NOT gates)
  ci.existence_verified AS domain_verified,
  CASE WHEN ci.name_match_score >= 70 THEN TRUE ELSE FALSE END AS name_coherent,
  CASE WHEN ci.state_match_result = 'PASS' THEN TRUE ELSE FALSE END AS state_coherent

FROM cl.company_identity ci;

-- Add comment for documentation
COMMENT ON VIEW cl.v_company_identity_eligible IS
'Canonical eligibility contract for downstream consumption.
DOCTRINE: eligible_for_outreach = (identity_pass >= 1 AND identity_status = ''PASS'')
existence_verified is INFORMATIONAL ONLY and MUST NOT unlock pipelines.';

-- ============================================================================
-- B) AUDIT LOG TABLE
-- ============================================================================
-- Track gate checks per run for observability

CREATE TABLE IF NOT EXISTS cl.identity_gate_audit (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL,
  stage TEXT NOT NULL,  -- 'OUTREACH_ENTRY', 'COMPANY_TARGET', etc.
  total_scanned INT NOT NULL,
  eligible_count INT NOT NULL,
  blocked_count INT NOT NULL,
  sample_blocked_ids UUID[] DEFAULT '{}',
  blocked_reasons JSONB DEFAULT '{}',  -- { "PENDING": 100, "FAIL_DOMAIN": 50, ... }
  gate_enforced BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gate_audit_run
ON cl.identity_gate_audit(run_id);

CREATE INDEX IF NOT EXISTS idx_gate_audit_stage
ON cl.identity_gate_audit(stage);

CREATE INDEX IF NOT EXISTS idx_gate_audit_created
ON cl.identity_gate_audit(created_at DESC);

COMMENT ON TABLE cl.identity_gate_audit IS
'Audit log for identity gate checks. Every downstream worker run should log here.';

-- ============================================================================
-- C) FAILED RECORDS TABLE (for gate failures)
-- ============================================================================
-- When a record reaches downstream but fails the gate, log it here

CREATE TABLE IF NOT EXISTS cl.identity_gate_failures (
  failure_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_unique_id UUID NOT NULL,
  run_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  error_code TEXT NOT NULL,  -- 'CT_UPSTREAM_IDENTITY_NOT_APPROVED'
  eligibility_reason TEXT,
  identity_pass INT,
  identity_status TEXT,
  existence_verified BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gate_failures_company
ON cl.identity_gate_failures(company_unique_id);

CREATE INDEX IF NOT EXISTS idx_gate_failures_run
ON cl.identity_gate_failures(run_id);

COMMENT ON TABLE cl.identity_gate_failures IS
'Records that reached downstream but failed the identity gate.
Error code CT_UPSTREAM_IDENTITY_NOT_APPROVED indicates upstream data quality issue.';

-- ============================================================================
-- D) SUMMARY VIEW FOR MONITORING
-- ============================================================================

DROP VIEW IF EXISTS cl.v_identity_gate_summary;

CREATE VIEW cl.v_identity_gate_summary AS
SELECT
  COUNT(*) AS total_companies,
  COUNT(*) FILTER (WHERE eligible_for_outreach = TRUE) AS eligible_count,
  COUNT(*) FILTER (WHERE eligible_for_outreach = FALSE) AS blocked_count,
  COUNT(*) FILTER (WHERE eligibility_reason = 'PASS') AS pass_count,
  COUNT(*) FILTER (WHERE eligibility_reason = 'PENDING') AS pending_count,
  COUNT(*) FILTER (WHERE eligibility_reason = 'FAIL_STATE') AS fail_state_count,
  COUNT(*) FILTER (WHERE eligibility_reason = 'FAIL_NAME') AS fail_name_count,
  COUNT(*) FILTER (WHERE eligibility_reason = 'FAIL_DOMAIN') AS fail_domain_count,
  COUNT(*) FILTER (WHERE eligibility_reason = 'UNKNOWN') AS unknown_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE eligible_for_outreach = TRUE) / COUNT(*), 2) AS eligible_pct
FROM cl.v_company_identity_eligible;

COMMENT ON VIEW cl.v_identity_gate_summary IS
'Summary statistics for identity gate eligibility. Use for monitoring dashboards.';

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================
-- SELECT * FROM cl.v_identity_gate_summary;
-- SELECT eligibility_reason, COUNT(*) FROM cl.v_company_identity_eligible GROUP BY 1;
-- SELECT * FROM cl.v_company_identity_eligible WHERE eligible_for_outreach = TRUE LIMIT 5;
