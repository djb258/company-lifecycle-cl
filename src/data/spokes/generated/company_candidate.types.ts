// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

/**
 * Canonical intake staging table for company candidates before identity minting
 * Table: company_candidate
 */
export interface CompanyCandidateRow {
  /** Unique candidate identifier, auto-generated, NOT company_unique_id */
  candidate_id: string;
  /** Origin system that submitted this candidate (e.g. nc_sos_excel, tx_api) */
  source_system: string;
  /** Unique identifier within the source system (e.g. NC SOS file number) */
  source_record_id: string;
  /** US state code (2 chars, uppercase), constrained to ^[A-Z]{2}$ */
  state_code: string;
  /** Complete raw data from source as JSONB, preserved for audit and reprocessing */
  raw_payload: Record<string, unknown>;
  /** Identifier for the ingestion batch/run, used for tracking and rollback */
  ingestion_run_id: string;
  /** Timestamp when candidate was ingested, auto-set */
  created_at: string;
  /** Status: PENDING, VERIFIED, or FAILED — only VERIFIED can promote to identity */
  verification_status: string;
  /** If FAILED, contains the error message or code from verification */
  verification_error?: string | null;
  /** Timestamp when verification completed (if VERIFIED or FAILED) */
  verified_at?: string | null;
  /** FK to cl.company_identity, NULL until candidate is verified and promoted */
  company_unique_id?: string | null;
}
