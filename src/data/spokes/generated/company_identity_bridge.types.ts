// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

/**
 * Join surface mapping source system records to sovereign company identities
 * Table: company_identity_bridge
 */
export interface CompanyIdentityBridgeRow {
  /** Unique bridge record identifier, auto-generated primary key */
  bridge_id: string;
  /** FK to cl.company_identity sovereign ID, unique per bridge record */
  company_sov_id: string;
  /** Unique identifier of the company in the source system */
  source_company_id: string;
  /** Origin system providing this bridge mapping (e.g. nc_sos, de_csv) */
  source_system: string;
  /** Confidence score (0-100) for the bridge match quality */
  match_confidence_score?: number | null;
  /** Method used to establish the bridge match (e.g. exact, fuzzy, manual) */
  match_method?: string | null;
  /** Evidence payload supporting the bridge match decision */
  match_evidence?: Record<string, unknown> | null;
  /** Status of the bridge record: active, inactive, superseded */
  bridge_status?: string | null;
  /** Timestamp when bridge record was created, auto-set */
  created_at?: string | null;
  /** Timestamp when bridge record was last updated, auto-set */
  updated_at?: string | null;
  /** Identity of the agent or user who created this bridge record */
  created_by?: string | null;
  /** Timestamp when bridge was validated by human or automated check */
  validated_at?: string | null;
  /** Identity of the agent or user who validated this bridge record */
  validated_by?: string | null;
}
