// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

/**
 * Sovereign identity registry — canonical source of truth for company identity minting and lifecycle tracking
 * Table: company_identity
 */
export interface CompanyIdentityRow {
  /** Sovereign, immutable, globally unique identifier for the company */
  company_unique_id: string;
  /** Canonical human-readable company name, may be corrected if originally incorrect */
  company_name: string;
  /** Primary web domain (no protocol, lowercase), identity anchor for the company */
  company_domain?: string | null;
  /** LinkedIn company page URL, identity anchor alongside domain */
  linkedin_company_url?: string | null;
  /** Origin system that created this identity, immutable after mint */
  source_system: string;
  /** Timestamp when identity was minted, immutable, always UTC */
  created_at: string;
  /** Alternative canonical name variant for the company */
  canonical_name?: string | null;
  /** State verification status from identity gate checks */
  state_verified?: string | null;
  /** Employee count band classification (e.g. 1-10, 11-50, 51-200) */
  employee_count_band?: string | null;
  /** Deterministic fingerprint of company attributes for collision detection */
  company_fingerprint?: string | null;
  /** Identifier for the lifecycle processing run that validated this company */
  lifecycle_run_id?: string | null;
  /** Pass flag (0 or 1+), default 0, incremented on successful identity gate pass */
  identity_pass?: number | null;
  /** Identity gate status: PENDING, PASS, or FAIL — determines downstream eligibility */
  identity_status?: string | null;
  /** Timestamp of last successful pass through the identity gate */
  last_pass_at?: string | null;
  /** Domain existence verification result, informational only */
  existence_verified?: boolean | null;
  /** Name matching confidence score from 0 to 100 */
  name_match_score?: number | null;
  /** State matching result: PASS, FAIL, or HARD_FAIL */
  state_match_result?: string | null;
  /** US state code (2 chars, uppercase), constrained to ^[A-Z]{2}$ or NULL */
  state_code?: string | null;
  /** Write-once pointer to outreach record, set when Outreach claims this company */
  outreach_id?: string | null;
  /** Write-once pointer to sales process, set when Sales opens opportunity */
  sales_process_id?: string | null;
  /** Write-once pointer to client record, set when company becomes client */
  client_id?: string | null;
  /** Write-once pointer to LCS record, set when company enters lifecycle communication system */
  lcs_id?: string | null;
  /** Timestamp when outreach_id was attached, auto-set on first write */
  outreach_attached_at?: string | null;
  /** Timestamp when sales_process_id was attached, auto-set on first write */
  sales_opened_at?: string | null;
  /** Timestamp when client_id was attached, auto-set on first write */
  client_promoted_at?: string | null;
  /** Timestamp when lcs_id was attached, auto-set on first write */
  lcs_attached_at?: string | null;
}
