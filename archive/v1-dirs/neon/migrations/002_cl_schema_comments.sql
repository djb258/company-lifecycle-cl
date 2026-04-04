-- CL Schema Comments
-- Documentation pass for AI readability and human clarity
-- Created: 2025-12-26

-- Table comment
COMMENT ON TABLE cl.company_identity IS
'Sovereign identity registry for Company Lifecycle (CL). Each row represents a formally admitted company. The company_unique_id is the only identifier downstream systems should use. This table does NOT contain lifecycle state, enrichment data, or operational information.';

-- Column comments
COMMENT ON COLUMN cl.company_identity.company_unique_id IS
'Sovereign, globally unique, immutable identifier. Auto-generated UUID. NEVER change or reuse.';

COMMENT ON COLUMN cl.company_identity.company_name IS
'Canonical human-readable company name. May be corrected if originally incorrect.';

COMMENT ON COLUMN cl.company_identity.company_domain IS
'Primary web domain (no protocol, lowercase). Identity anchor. At least one of domain or linkedin required.';

COMMENT ON COLUMN cl.company_identity.linkedin_company_url IS
'LinkedIn company page URL. Identity anchor. At least one of domain or linkedin required.';

COMMENT ON COLUMN cl.company_identity.source_system IS
'Origin system that created this identity. Immutable. Used for audit and provenance.';

COMMENT ON COLUMN cl.company_identity.created_at IS
'Timestamp when identity was minted. Immutable. Always UTC.';
