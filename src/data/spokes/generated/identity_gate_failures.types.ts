// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

/**
 * Records that reached downstream but failed the identity gate eligibility check
 * Table: identity_gate_failures
 */
export interface IdentityGateFailuresRow {
  /** Unique failure record identifier, auto-generated primary key */
  failure_id: string;
  /** FK to cl.company_identity for the company that failed the gate */
  company_unique_id: string;
  /** Downstream run identifier where gate failure occurred */
  run_id: string;
  /** Stage name where failure occurred in downstream pipeline */
  stage: string;
  /** Error code: CT_UPSTREAM_IDENTITY_NOT_APPROVED */
  error_code: string;
  /** Reason for ineligibility: PASS, PENDING, FAIL_STATE, FAIL_NAME, FAIL_DOMAIN, UNKNOWN */
  eligibility_reason?: string | null;
  /** Value of identity_pass column at time of gate failure */
  identity_pass?: number | null;
  /** Value of identity_status at time of gate failure */
  identity_status?: string | null;
  /** Value of existence_verified at time of gate failure */
  existence_verified?: boolean | null;
  /** Timestamp when failure was logged, auto-set */
  created_at: string;
}
