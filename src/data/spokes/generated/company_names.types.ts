// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

/**
 * Name variants and aliases for companies, sidecar to spine identity table
 * Table: company_names
 */
export interface CompanyNamesRow {
  /** Unique name record identifier, auto-generated primary key */
  name_id: string;
  /** FK to cl.company_identity spine table, links name to company */
  company_unique_id: string;
  /** The actual company name string (variant, alias, or legal name) */
  name_value: string;
  /** Type classification: legal, trade, dba, alias, abbreviation */
  name_type: string;
  /** Whether this is the primary name for the company, default false */
  is_primary?: boolean | null;
  /** ISO language code for this name variant, default en */
  language?: string | null;
  /** Whether this name variant has been verified, default false */
  verified?: boolean | null;
  /** Timestamp when name verification was completed */
  verification_date?: string | null;
  /** Source or method of name verification (e.g. SOS filing, manual) */
  verification_source?: string | null;
  /** Timestamp when name record was created, auto-set */
  created_at?: string | null;
  /** Timestamp when name record was last updated, auto-set */
  updated_at?: string | null;
  /** Identity of the agent or user who created this name record */
  created_by?: string | null;
  /** Additional metadata for the name record as JSON */
  metadata?: Record<string, unknown> | null;
}
