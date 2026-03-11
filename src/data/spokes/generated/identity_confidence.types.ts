// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

/**
 * Confidence scoring envelope for identity attributes across verification dimensions
 * Table: identity_confidence
 */
export interface IdentityConfidenceRow {
  /** FK to cl.company_identity, primary key (1:1 relationship with spine) */
  company_unique_id: string;
  /** Name matching confidence score from 0 to 100 */
  name_confidence_score?: number | null;
  /** Domain verification confidence score from 0 to 100 */
  domain_confidence_score?: number | null;
  /** LinkedIn profile match confidence score from 0 to 100 */
  linkedin_confidence_score?: number | null;
  /** State registration confidence score from 0 to 100 */
  state_confidence_score?: number | null;
  /** Composite overall confidence score from 0 to 100 */
  overall_confidence_score?: number | null;
  /** Derived confidence level: HIGH, MEDIUM, or LOW */
  confidence_level?: string | null;
  /** Name dimension verification status: verified, pending, or failed */
  name_verification_status?: string | null;
  /** Domain dimension verification status: verified, pending, or failed */
  domain_verification_status?: string | null;
  /** LinkedIn dimension verification status: verified, pending, or failed */
  linkedin_verification_status?: string | null;
  /** State dimension verification status: verified, pending, or failed */
  state_verification_status?: string | null;
  /** Evidence payload supporting name confidence score as JSON */
  name_evidence?: Record<string, unknown> | null;
  /** Evidence payload supporting domain confidence score as JSON */
  domain_evidence?: Record<string, unknown> | null;
  /** Evidence payload supporting LinkedIn confidence score as JSON */
  linkedin_evidence?: Record<string, unknown> | null;
  /** Evidence payload supporting state confidence score as JSON */
  state_evidence?: Record<string, unknown> | null;
  /** Timestamp when confidence scores were last calculated */
  last_calculated_at?: string | null;
  /** Method used for confidence calculation (e.g. weighted_average, rules_v2) */
  calculation_method?: string | null;
  /** Timestamp when confidence record was created, auto-set */
  created_at?: string | null;
  /** Timestamp when confidence record was last updated, auto-set */
  updated_at?: string | null;
}
