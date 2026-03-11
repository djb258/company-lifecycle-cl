// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

/**
 * Domain sharing relationships between parent and child companies in hierarchies
 * Table: domain_hierarchy
 */
export interface DomainHierarchyRow {
  /** Unique hierarchy record identifier, auto-generated primary key */
  hierarchy_id: string;
  /** Shared domain that connects parent and child companies */
  domain: string;
  /** FK to cl.company_identity for the definitive parent entity */
  parent_company_id?: string | null;
  /** FK to cl.company_identity for subsidiary/branch/location entity */
  child_company_id?: string | null;
  /** Hierarchy type: PARENT_ANCHOR, CHILD_OPERATING_UNIT, SIBLING_BRAND, AMBIGUOUS_UNRESOLVED */
  relationship_type: string;
  /** Confidence score 0-100 for the hierarchy relationship determination */
  confidence_score?: number | null;
  /** How the hierarchy was determined: CORPORATE_SIGNALS, OLDEST_RECORD, MANUAL */
  resolution_method?: string | null;
  /** Timestamp when hierarchy relationship was recorded, auto-set */
  created_at: string;
  /** Timestamp when ambiguity was resolved, if applicable */
  resolved_at?: string | null;
  /** Identity of the agent or user who resolved the ambiguity */
  resolved_by?: string | null;
}
