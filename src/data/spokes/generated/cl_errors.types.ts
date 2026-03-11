// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

/**
 * Unified error logging for all CL validation passes with retry and TTL support
 * Table: cl_errors
 */
export interface ClErrorsRow {
  /** Unique error identifier, auto-generated primary key */
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
  /** Timestamp when error was logged, auto-set */
  created_at: string;
  /** Timestamp when error was resolved, NULL if unresolved */
  resolved_at?: string | null;
  /** Number of retry attempts made, default 0 */
  retry_count?: number | null;
  /** Maximum retries before marking permanent, default 3 */
  retry_ceiling?: number | null;
  /** Earliest time to retry this error */
  retry_after?: string | null;
  /** Tool that resolved or attempted resolution (e.g. MXLookup, Firecrawl) */
  tool_used?: string | null;
  /** Toolbox tier: 0=free, 1=cheap, 2=surgical */
  tool_tier?: number | null;
  /** TTL for transient errors, auto-resolve after this timestamp */
  expires_at?: string | null;
}
