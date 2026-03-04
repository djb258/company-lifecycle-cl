-- Migration 006 ROLLBACK: CTB Registry + Doctrine Library Tables
-- Work Packet: wp-20260303-ctb-doctrine-db-scope-correction
-- Direction: ROLLBACK
-- WARNING: This will drop all ctb/doctrine data. Not reversible.

BEGIN;

-- Drop trigger + function
DROP TRIGGER IF EXISTS trg_set_updated_at ON doctrine.doctrine_library;
DROP FUNCTION IF EXISTS doctrine.set_updated_at();

-- Drop tables (reverse order of creation)
DROP TABLE IF EXISTS doctrine.doctrine_library_error;
DROP TABLE IF EXISTS doctrine.doctrine_key;
DROP TABLE IF EXISTS doctrine.doctrine_library;
DROP TABLE IF EXISTS ctb.table_registry;

-- Drop schemas (only if empty)
DROP SCHEMA IF EXISTS doctrine;
DROP SCHEMA IF EXISTS ctb;

-- Note: pgvector extension is NOT dropped (may be used by other schemas)

COMMIT;
