-- Company Candidate Intake Table
-- Doctrine: State-Agnostic Sovereign Intake Engine
-- Created: 2026-01-05
--
-- PURPOSE:
-- This table is the CANONICAL INTAKE POINT for all company candidates.
-- NC is Source Stream #001. Future states are additional streams.
-- State is DATA, not CODE. No state-specific logic belongs in CL.
--
-- HARD CONSTRAINTS:
-- 1. Do NOT delete or re-mint existing IDs
-- 2. Do NOT weaken verification logic
-- 3. Do NOT special-case any state in lifecycle logic
-- 4. Fail closed if state or source is missing

-- =============================================================================
-- CANONICAL INTAKE TABLE: cl.company_candidate
-- =============================================================================
-- All company candidates MUST flow through this table before identity minting.
-- This table is STAGING, not IDENTITY. Verification happens AFTER insertion here.

CREATE TABLE IF NOT EXISTS cl.company_candidate (
    -- Primary key
    candidate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source identification (REQUIRED)
    source_system TEXT NOT NULL,
    source_record_id TEXT NOT NULL,

    -- State identification (REQUIRED - state is data, not code)
    state_code CHAR(2) NOT NULL,

    -- Raw payload from source (JSONB for flexibility)
    raw_payload JSONB NOT NULL,

    -- Ingestion tracking
    ingestion_run_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Verification status
    verification_status TEXT NOT NULL DEFAULT 'PENDING',
    verification_error TEXT NULL,
    verified_at TIMESTAMPTZ NULL,

    -- Link to minted identity (NULL until verified and promoted)
    company_unique_id UUID NULL REFERENCES cl.company_identity(company_unique_id)
);

-- Unique constraint: One candidate per source system + record ID
-- This prevents duplicate ingestion from the same source
ALTER TABLE cl.company_candidate
ADD CONSTRAINT unique_source_record
UNIQUE (source_system, source_record_id);

-- Admission gate: State code must be valid US state
ALTER TABLE cl.company_candidate
ADD CONSTRAINT valid_state_code
CHECK (
    state_code ~ '^[A-Z]{2}$'
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_candidate_state_code
ON cl.company_candidate (state_code);

CREATE INDEX IF NOT EXISTS idx_candidate_verification_status
ON cl.company_candidate (verification_status);

CREATE INDEX IF NOT EXISTS idx_candidate_source_system
ON cl.company_candidate (source_system);

CREATE INDEX IF NOT EXISTS idx_candidate_ingestion_run
ON cl.company_candidate (ingestion_run_id);

-- =============================================================================
-- ALTER cl.company_identity: Add state_code
-- =============================================================================
-- State code is now a first-class field on identity

ALTER TABLE cl.company_identity
ADD COLUMN IF NOT EXISTS state_code CHAR(2) NULL;

-- Add constraint for valid state code
ALTER TABLE cl.company_identity
ADD CONSTRAINT identity_valid_state_code
CHECK (
    state_code IS NULL OR state_code ~ '^[A-Z]{2}$'
);

-- Index for state-based queries
CREATE INDEX IF NOT EXISTS idx_identity_state_code
ON cl.company_identity (state_code);

-- =============================================================================
-- SCHEMA COMMENTS
-- =============================================================================

COMMENT ON TABLE cl.company_candidate IS
'Canonical intake staging table for company candidates. All sources (NC, TX, FL, etc.) insert here. Verification happens downstream. Identity minting only after PASS.';

COMMENT ON COLUMN cl.company_candidate.candidate_id IS
'Unique candidate identifier. Auto-generated. NOT the same as company_unique_id.';

COMMENT ON COLUMN cl.company_candidate.source_system IS
'Origin system that submitted this candidate. E.g., "nc_sos_excel", "tx_api", "manual_entry".';

COMMENT ON COLUMN cl.company_candidate.source_record_id IS
'Unique identifier within the source system. E.g., NC SOS file number.';

COMMENT ON COLUMN cl.company_candidate.state_code IS
'US state code (2 chars). State is DATA, not code. NC = first stream, not special.';

COMMENT ON COLUMN cl.company_candidate.raw_payload IS
'Complete raw data from source as JSONB. Preserved for audit and reprocessing.';

COMMENT ON COLUMN cl.company_candidate.ingestion_run_id IS
'Identifier for the ingestion batch/run. Used for tracking and rollback.';

COMMENT ON COLUMN cl.company_candidate.verification_status IS
'PENDING | VERIFIED | FAILED. Only VERIFIED candidates can be promoted to identity.';

COMMENT ON COLUMN cl.company_candidate.verification_error IS
'If FAILED, contains the error message/code.';

COMMENT ON COLUMN cl.company_candidate.company_unique_id IS
'FK to cl.company_identity. NULL until candidate is verified and promoted.';

COMMENT ON COLUMN cl.company_identity.state_code IS
'US state code (2 chars). Propagated from candidate at identity minting time.';

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT ALL ON cl.company_candidate TO "Marketing DB_owner";
