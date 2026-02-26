// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

/**
 * Archived errors preserving forensic history without cluttering active error table
 * Table: cl_errors_archive
 */
export interface ClErrorsArchiveRow {
  /** Unique error identifier copied from cl_errors */
  error_id: string;
  /** FK to cl.company_identity, NULL for pre-mint errors */
  company_unique_id?: string | null;
  /** Identifier for the lifecycle processing run that produced this error */
  lifecycle_run_id: string;
  /** Validation pass category: existence, name, domain, collision, firmographic */
  pass_name: string;
  /** Standardized failure reason code (e.g. EXISTENCE_FAIL, NAME_FAIL) */
  failure_reason_code: string;
  /** Complete snapshot of inputs at time of failure for audit and reprocessing */
  inputs_snapshot?: Record<string, unknown> | null;
  /** Original timestamp when error was logged */
  created_at: string;
  /** Timestamp when error was resolved */
  resolved_at?: string | null;
  /** Number of retry attempts made before archival */
  retry_count?: number | null;
  /** Maximum retries before marking permanent */
  retry_ceiling?: number | null;
  /** Earliest time to retry this error */
  retry_after?: string | null;
  /** Tool that resolved or attempted resolution */
  tool_used?: string | null;
  /** Toolbox tier: 0=free, 1=cheap, 2=surgical */
  tool_tier?: number | null;
  /** TTL for transient errors */
  expires_at?: string | null;
  /** Timestamp when error was archived, auto-set */
  archived_at: string;
  /** Reason for archiving: RESOLVED, TTL_EXPIRED, MANUAL */
  archive_reason?: string | null;
}
