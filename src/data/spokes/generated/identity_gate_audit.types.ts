// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

/**
 * Audit log for identity gate checks per downstream run with eligibility statistics
 * Table: identity_gate_audit
 */
export interface IdentityGateAuditRow {
  /** Unique audit record identifier, auto-generated primary key */
  audit_id: string;
  /** Identifier for the lifecycle or downstream run being audited */
  run_id: string;
  /** Stage name: OUTREACH_ENTRY, COMPANY_TARGET, or other downstream stage */
  stage: string;
  /** Total companies scanned in this run */
  total_scanned: number;
  /** Count of companies that passed the identity gate */
  eligible_count: number;
  /** Count of companies that failed the identity gate */
  blocked_count: number;
  /** Sample of blocked company IDs as array, default empty */
  sample_blocked_ids?: string | null;
  /** Reason distribution as JSON (e.g. PENDING: 100, FAIL_DOMAIN: 50) */
  blocked_reasons?: Record<string, unknown> | null;
  /** Whether gate enforcement was active for this run, default TRUE */
  gate_enforced: boolean;
  /** Timestamp when audit record was created, auto-set */
  created_at: string;
}
