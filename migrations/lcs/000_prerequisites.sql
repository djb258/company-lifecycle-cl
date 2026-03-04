-- ═══════════════════════════════════════════════════════════════
-- LCS Prerequisites for Fresh Neon Database
-- Run BEFORE: 001_lcs_schema_v2.2.0.sql
-- Authority: HUB-CL-001
-- Generated: 2026-03-03
--
-- Purpose: Create the minimum cl.company_identity spine table
-- and cross-hub stub schemas that the LCS matviews reference.
-- This is for database bootstrap only — production databases
-- have these tables populated by their respective hubs.
--
-- Execution:
--   psql $NEON_CONNECTION_STRING -f migrations/lcs/000_prerequisites.sql
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- CL Schema + Spine Table (company_identity)
-- This is CL's own sovereign table — belongs in this database.
-- ═══════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS cl;

CREATE TABLE IF NOT EXISTS cl.company_identity (
    company_unique_id       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name            TEXT            NOT NULL,
    company_domain          TEXT,
    linkedin_company_url    TEXT,
    source_system           TEXT            NOT NULL DEFAULT 'manual',
    state_code              CHAR(2),
    final_outcome           TEXT            DEFAULT 'PENDING',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    promoted_at             TIMESTAMPTZ,
    retired_at              TIMESTAMPTZ,

    CONSTRAINT cl_identity_admission_gate CHECK (
        company_domain IS NOT NULL OR linkedin_company_url IS NOT NULL
    ),
    CONSTRAINT chk_final_outcome CHECK (
        final_outcome IN ('PENDING', 'PASS', 'FAIL', 'RETIRED')
    )
);

CREATE INDEX IF NOT EXISTS idx_cl_company_domain
    ON cl.company_identity (company_domain);
CREATE INDEX IF NOT EXISTS idx_cl_company_linkedin
    ON cl.company_identity (linkedin_company_url);
CREATE INDEX IF NOT EXISTS idx_cl_company_outcome
    ON cl.company_identity (final_outcome);

COMMENT ON TABLE cl.company_identity IS 'CL Sovereign Identity — spine table for all company identities. Source of company_unique_id.';

-- ═══════════════════════════════════════════════════════════════
-- Cross-Hub Stub Schemas
-- Minimum structure for lcs.v_company_intelligence matview.
-- In production, these are owned by their respective hubs.
-- Here they are structural stubs (empty, correct schema).
-- ═══════════════════════════════════════════════════════════════

-- People sub-hub
CREATE SCHEMA IF NOT EXISTS people;

CREATE TABLE IF NOT EXISTS people.people_master (
    unique_id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name           TEXT,
    email               TEXT,
    linkedin_url        TEXT,
    last_verified_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS people.company_slot (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_unique_id   TEXT            NOT NULL,
    slot_type           TEXT            NOT NULL,
    is_filled           BOOLEAN         NOT NULL DEFAULT FALSE,
    person_unique_id    UUID
);

CREATE INDEX IF NOT EXISTS idx_people_slot_company
    ON people.company_slot (company_unique_id, slot_type);

-- Outreach sub-hub
CREATE SCHEMA IF NOT EXISTS outreach;

CREATE TABLE IF NOT EXISTS outreach.outreach (
    outreach_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    sovereign_id        UUID
);

CREATE TABLE IF NOT EXISTS outreach.dol (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    outreach_id         UUID,
    renewal_month       INT,
    outreach_start_month INT,
    filing_present      BOOLEAN,
    carrier             TEXT,
    broker_or_advisor   TEXT,
    funding_type        TEXT,
    updated_at          TIMESTAMPTZ     DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outreach.blog (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    outreach_id         UUID,
    context_summary     TEXT,
    source_type         TEXT,
    source_url          TEXT,
    context_timestamp   TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     DEFAULT NOW()
);

-- Company sub-hub
CREATE SCHEMA IF NOT EXISTS company;

CREATE TABLE IF NOT EXISTS company.company_source_urls (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_unique_id   TEXT,
    source_type         TEXT
);

COMMIT;
