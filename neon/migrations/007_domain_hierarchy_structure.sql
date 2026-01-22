-- ============================================================================
-- MIGRATION 007: DOMAIN HIERARCHY STRUCTURE
-- ============================================================================
-- Doctrine: Errors = unexpected, actionable failures
--           Hierarchy = structure (different bucket)
--
-- Domain sharing between parent/child companies is EXPECTED STRUCTURE, not error.
-- This table stores hierarchy relationships; cl.cl_errors stores actual failures.
-- ============================================================================

-- Create hierarchy structure table
CREATE TABLE IF NOT EXISTS cl.domain_hierarchy (
  hierarchy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  parent_company_id UUID REFERENCES cl.company_identity(company_unique_id),
  child_company_id UUID REFERENCES cl.company_identity(company_unique_id),
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'PARENT_ANCHOR',           -- Definitive parent entity
    'CHILD_OPERATING_UNIT',    -- Subsidiary/branch/location
    'SIBLING_BRAND',           -- Same parent, different brand
    'AMBIGUOUS_UNRESOLVED'     -- No clear parent - needs resolution
  )),
  confidence_score INT CHECK (confidence_score >= 0 AND confidence_score <= 100),
  resolution_method TEXT,      -- How was this determined? (e.g., 'CORPORATE_SIGNALS', 'OLDEST_RECORD', 'MANUAL')
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,     -- When ambiguity was resolved (if applicable)
  resolved_by TEXT,            -- Who/what resolved it
  UNIQUE(domain, child_company_id)
);

-- Index for domain lookups
CREATE INDEX IF NOT EXISTS idx_domain_hierarchy_domain
ON cl.domain_hierarchy(domain);

-- Index for parent lookups
CREATE INDEX IF NOT EXISTS idx_domain_hierarchy_parent
ON cl.domain_hierarchy(parent_company_id);

-- Index for unresolved ambiguities (these are the actual problems)
CREATE INDEX IF NOT EXISTS idx_domain_hierarchy_ambiguous
ON cl.domain_hierarchy(relationship_type)
WHERE relationship_type = 'AMBIGUOUS_UNRESOLVED';

-- Archive table for historical collision errors (preserves forensic history)
CREATE TABLE IF NOT EXISTS cl.cl_errors_archive (
  LIKE cl.cl_errors INCLUDING ALL
);

-- Add archive metadata columns
ALTER TABLE cl.cl_errors_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE cl.cl_errors_archive ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Comments for documentation
COMMENT ON TABLE cl.domain_hierarchy IS 'Domain sharing relationships - STRUCTURE not errors. Parent/child company hierarchies.';
COMMENT ON TABLE cl.cl_errors_archive IS 'Archived errors - preserves forensic history without cluttering active error table.';
COMMENT ON COLUMN cl.domain_hierarchy.relationship_type IS 'PARENT_ANCHOR = definitive parent, CHILD_OPERATING_UNIT = subsidiary, AMBIGUOUS_UNRESOLVED = needs human review';
