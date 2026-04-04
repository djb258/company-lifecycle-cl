-- CL Company Identity Schema
-- Doctrine: Minimal, Deterministic, Sovereign
-- Created: 2025-12-26

-- Create CL schema namespace
CREATE SCHEMA IF NOT EXISTS cl;

-- CL Company Identity - Sovereign table
-- This is the ONLY table that matters for CL at this stage
CREATE TABLE IF NOT EXISTS cl.company_identity (
    company_unique_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_name TEXT NOT NULL,
    company_domain TEXT NULL,
    linkedin_company_url TEXT NULL,

    source_system TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admission Gate Constraint
-- At least ONE of company_domain or linkedin_company_url MUST exist
-- This single constraint IS the doctrine in code
ALTER TABLE cl.company_identity
ADD CONSTRAINT cl_identity_admission_gate
CHECK (
    company_domain IS NOT NULL
    OR linkedin_company_url IS NOT NULL
);

-- Indexes (Only What's Needed)
CREATE INDEX IF NOT EXISTS idx_cl_company_domain
ON cl.company_identity (company_domain);

CREATE INDEX IF NOT EXISTS idx_cl_company_linkedin
ON cl.company_identity (linkedin_company_url);

-- Grant permissions
GRANT USAGE ON SCHEMA cl TO "Marketing DB_owner";
GRANT ALL ON ALL TABLES IN SCHEMA cl TO "Marketing DB_owner";
