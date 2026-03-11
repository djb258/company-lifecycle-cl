// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

/**
 * CTB ERROR — fail-closed logging for invalid CID-to-MID creation or output failures that cannot be recorded on MID
 * Table: message_error
 */
export interface MessageErrorRow {
  /** Primary key, auto-generated */
  error_id: string;
  /** FK to cl.company_identity(company_unique_id) */
  sovereign_id: string;
  /** FK to lcs record, nullable if lookup fails before resolution */
  lcs_id?: string | null;
  /** Stage that originated the failed operation: OUTREACH, SALES, or CLIENT */
  source_stage: string;
  /** CID from source table, nullable if error occurs before CID resolution */
  cid?: string | null;
  /** Standardized error code: INVALID_CID, LCS_NOT_FOUND, SUPPRESSED, PROVIDER_REJECT, VALIDATION_FAIL */
  error_code: string;
  /** Structured error detail payload for debugging and audit */
  payload?: Record<string, unknown> | null;
  /** Error creation timestamp, auto-set, immutable */
  created_at: string;
}
