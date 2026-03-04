-- Migration 006: CTB Registry + Doctrine Library Tables
-- Work Packet: wp-20260303-ctb-doctrine-db-scope-correction
-- Direction: FORWARD
-- Applied: 2026-03-03 (retroactive — tables created directly, this file documents the DDL)
-- Source: Research database (ep-young-block-aii5nj6b)

BEGIN;

-- =============================================================================
-- 1. Extensions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- 2. Schemas
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS ctb;
CREATE SCHEMA IF NOT EXISTS doctrine;

-- =============================================================================
-- 3. ctb.table_registry — Registry-First Enforcement
-- =============================================================================

CREATE TABLE IF NOT EXISTS ctb.table_registry (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_schema    TEXT NOT NULL DEFAULT 'public',
    table_name      TEXT NOT NULL,
    hub_id          TEXT NOT NULL,
    subhub_id       TEXT NOT NULL,
    leaf_type       TEXT NOT NULL,
    is_frozen       BOOLEAN NOT NULL DEFAULT FALSE,
    description     TEXT,
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    registered_by   TEXT NOT NULL DEFAULT CURRENT_USER,

    CONSTRAINT uq_table_registry_table UNIQUE (table_schema, table_name),
    CONSTRAINT table_registry_leaf_type_check CHECK (
        leaf_type IN ('CANONICAL', 'ERROR', 'STAGING', 'MV', 'REGISTRY')
    )
);

-- =============================================================================
-- 4. doctrine.doctrine_library — Vectorized Doctrine Content
-- =============================================================================

CREATE TABLE IF NOT EXISTS doctrine.doctrine_library (
    id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    doctrine_id     TEXT NOT NULL UNIQUE,
    domain          TEXT NOT NULL,
    audience        TEXT NOT NULL,
    major_section   INTEGER NOT NULL,
    minor_section   INTEGER NOT NULL,
    chunk_sequence  INTEGER NOT NULL,
    section_title   TEXT,
    content         TEXT NOT NULL,
    token_count     INTEGER NOT NULL,
    embedding       vector(1536) NOT NULL,
    source_file     TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'ACTIVE',
    version         TEXT NOT NULL DEFAULT '1.0.0',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT doctrine_library_audience_check CHECK (audience IN ('INTERNAL', 'EXTERNAL')),
    CONSTRAINT doctrine_library_status_check CHECK (status IN ('DRAFT', 'ACTIVE', 'DEPRECATED'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dl_doctrine_id ON doctrine.doctrine_library (doctrine_id);
CREATE INDEX IF NOT EXISTS idx_dl_domain_audience ON doctrine.doctrine_library (domain, audience);
CREATE INDEX IF NOT EXISTS idx_dl_embedding ON doctrine.doctrine_library
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION doctrine.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_updated_at
    BEFORE UPDATE ON doctrine.doctrine_library
    FOR EACH ROW
    EXECUTE FUNCTION doctrine.set_updated_at();

-- =============================================================================
-- 5. doctrine.doctrine_key — Section Index
-- =============================================================================

CREATE TABLE IF NOT EXISTS doctrine.doctrine_key (
    key_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    domain          TEXT NOT NULL,
    major_section   INTEGER NOT NULL,
    minor_section   INTEGER NOT NULL,
    section_title   TEXT NOT NULL,
    audience        TEXT NOT NULL,
    chunk_count     INTEGER NOT NULL,
    first_doctrine_id TEXT NOT NULL,

    CONSTRAINT uq_doctrine_key UNIQUE (domain, major_section, minor_section, audience)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dk_lookup ON doctrine.doctrine_key (domain, major_section, minor_section, audience);
CREATE INDEX IF NOT EXISTS idx_dk_title_search ON doctrine.doctrine_key
    USING gin (to_tsvector('english', section_title));

-- =============================================================================
-- 6. doctrine.doctrine_library_error — Error Log
-- =============================================================================

CREATE TABLE IF NOT EXISTS doctrine.doctrine_library_error (
    error_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    failed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    operation       TEXT NOT NULL,
    error_code      TEXT,
    error_message   TEXT,
    offending_payload JSONB
);

COMMIT;
