-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 016: CTB Advanced Governance Layer
-- ═══════════════════════════════════════════════════════════════════════════════
-- Authority: imo-creator v3.3.0 (Constitutional)
-- Purpose: Deploy remaining CTB governance infrastructure from templates 005-011:
--          RAW immutability, batch registry, active view helpers, vendor/bridge
--          validation functions, role separation, application role enforcement.
-- Source templates: 005_raw_immutability, 006_raw_batch_registry,
--                   007_raw_active_view_template, 008_vendor_json_template,
--                   009_bridge_template, 010_vendor_write_permissions,
--                   011_enforce_application_role
-- Depends: 015_ctb_governance_layer.sql (DDL gate, write guards, promotion)
-- Idempotent: YES (CREATE OR REPLACE, IF NOT EXISTS throughout)
-- ═══════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: Vendor Bridges Registry (from template 005)
-- Declares allowed vendor integration points for RAW ingestion.
-- Every vendor bridge must be registered before writing to RAW tables.
-- Doctrine: CTB_REGISTRY_ENFORCEMENT.md §8.1
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ctb.vendor_bridges (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bridge_id           TEXT NOT NULL,
    vendor_source       TEXT NOT NULL,
    bridge_version      TEXT NOT NULL,
    target_schema       TEXT NOT NULL DEFAULT 'public',
    target_table        TEXT NOT NULL,
    hub_id              TEXT NOT NULL,
    subhub_id           TEXT NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    description         TEXT,
    registered_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    registered_by       TEXT NOT NULL DEFAULT current_user,

    CONSTRAINT uq_vendor_bridge UNIQUE (bridge_id)
);

COMMENT ON TABLE ctb.vendor_bridges IS 'Registered vendor bridges — each declares an allowed integration point for RAW ingestion';
COMMENT ON COLUMN ctb.vendor_bridges.bridge_id IS 'Unique bridge identifier (e.g., stripe-invoices-v2)';
COMMENT ON COLUMN ctb.vendor_bridges.vendor_source IS 'External system name (e.g., stripe, hubspot, manual_csv)';
COMMENT ON COLUMN ctb.vendor_bridges.bridge_version IS 'Semantic version of the bridge logic';
COMMENT ON COLUMN ctb.vendor_bridges.target_table IS 'RAW table this bridge writes to';

CREATE INDEX IF NOT EXISTS idx_vendor_bridges_target
    ON ctb.vendor_bridges (target_schema, target_table);

CREATE INDEX IF NOT EXISTS idx_vendor_bridges_source
    ON ctb.vendor_bridges (vendor_source);


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: Immutability Enforcement (from template 005)
-- INSERT-only on STAGING, MV, REGISTRY, CANONICAL tables.
-- ERROR tables allow INSERT + UPDATE but not DELETE.
-- Doctrine: CTB_REGISTRY_ENFORCEMENT.md §8.2
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION ctb.enforce_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ctb, pg_catalog
AS $$
DECLARE
    target_leaf_type TEXT;
BEGIN
    SELECT tr.leaf_type INTO target_leaf_type
    FROM ctb.table_registry tr
    WHERE tr.table_schema = TG_TABLE_SCHEMA
      AND tr.table_name = TG_TABLE_NAME;

    -- If table is not registered, let write_guard_check handle it
    IF target_leaf_type IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- ERROR tables: allow INSERT and UPDATE, reject DELETE
    IF target_leaf_type = 'ERROR' THEN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'CTB_IMMUTABILITY: DELETE on ERROR table %.% is not allowed. '
                            'ERROR tables are append-only (INSERT + UPDATE permitted). '
                            'Doctrine: CTB_REGISTRY_ENFORCEMENT.md §8.2',
                            TG_TABLE_SCHEMA, TG_TABLE_NAME;
        END IF;
        RETURN NEW;
    END IF;

    -- STAGING, MV, REGISTRY, CANONICAL: INSERT only
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'CTB_IMMUTABILITY: UPDATE on %.% (leaf_type=%) is not allowed. '
                        'All STAGING, SUPPORTING, and CANONICAL tables are INSERT-only. '
                        'Corrections must flow through batch supersede. '
                        'Doctrine: CTB_REGISTRY_ENFORCEMENT.md §8.2',
                        TG_TABLE_SCHEMA, TG_TABLE_NAME, target_leaf_type;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'CTB_IMMUTABILITY: DELETE on %.% (leaf_type=%) is not allowed. '
                        'All governed tables are append-only. Rows are permanent. '
                        'Doctrine: CTB_REGISTRY_ENFORCEMENT.md §8.2',
                        TG_TABLE_SCHEMA, TG_TABLE_NAME, target_leaf_type;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION ctb.enforce_immutability() IS 'Row-level trigger: enforces INSERT-only on governed tables (ERROR allows UPDATE)';

-- Helper: attach immutability guard
CREATE OR REPLACE FUNCTION ctb.create_immutability_guard(
    p_schema TEXT,
    p_table TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ctb, pg_catalog
AS $$
DECLARE
    trigger_name TEXT;
    full_table TEXT;
BEGIN
    trigger_name := 'trg_ctb_immutability_' || p_table;
    full_table := quote_ident(p_schema) || '.' || quote_ident(p_table);

    EXECUTE format(
        'DROP TRIGGER IF EXISTS %I ON %s',
        trigger_name, full_table
    );

    EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %s '
        'FOR EACH ROW EXECUTE FUNCTION ctb.enforce_immutability()',
        trigger_name, full_table
    );

    RAISE NOTICE 'CTB immutability guard attached to %', full_table;
END;
$$;

COMMENT ON FUNCTION ctb.create_immutability_guard(TEXT, TEXT) IS 'Helper: attach INSERT-only enforcement trigger to a governed table';

-- Helper: remove immutability guard
CREATE OR REPLACE FUNCTION ctb.remove_immutability_guard(
    p_schema TEXT,
    p_table TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ctb, pg_catalog
AS $$
DECLARE
    trigger_name TEXT;
    full_table TEXT;
BEGIN
    trigger_name := 'trg_ctb_immutability_' || p_table;
    full_table := quote_ident(p_schema) || '.' || quote_ident(p_table);

    EXECUTE format(
        'DROP TRIGGER IF EXISTS %I ON %s',
        trigger_name, full_table
    );

    RAISE NOTICE 'CTB immutability guard removed from %', full_table;
END;
$$;

COMMENT ON FUNCTION ctb.remove_immutability_guard(TEXT, TEXT) IS 'Helper: remove INSERT-only enforcement trigger from a table';


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: RAW Batch Registry (from template 006)
-- Tracks every ingestion batch with status lifecycle and supersede chain.
-- Doctrine: CTB_REGISTRY_ENFORCEMENT.md §8.3
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ctb.raw_batch_registry (
    batch_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bridge_id           TEXT NOT NULL,
    vendor_source       TEXT NOT NULL,
    bridge_version      TEXT NOT NULL,
    target_schema       TEXT NOT NULL DEFAULT 'public',
    target_table        TEXT NOT NULL,
    row_count           INTEGER NOT NULL DEFAULT 0,
    supersedes_batch_id UUID,
    status              TEXT NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'FAILED')),
    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    ingested_by         TEXT NOT NULL DEFAULT current_user,

    CONSTRAINT fk_batch_bridge FOREIGN KEY (bridge_id)
        REFERENCES ctb.vendor_bridges (bridge_id)
);

COMMENT ON TABLE ctb.raw_batch_registry IS 'Tracks every ingestion batch — status lifecycle (ACTIVE -> SUPERSEDED), supersede chain';
COMMENT ON COLUMN ctb.raw_batch_registry.batch_id IS 'Matches ingestion_batch_id on RAW table rows';
COMMENT ON COLUMN ctb.raw_batch_registry.supersedes_batch_id IS 'Previous batch this one replaces (corrections flow through supersede)';
COMMENT ON COLUMN ctb.raw_batch_registry.status IS 'ACTIVE (current), SUPERSEDED (replaced by newer batch), FAILED (ingestion error)';

CREATE INDEX IF NOT EXISTS idx_raw_batch_registry_bridge
    ON ctb.raw_batch_registry (bridge_id);

CREATE INDEX IF NOT EXISTS idx_raw_batch_registry_target
    ON ctb.raw_batch_registry (target_schema, target_table);

CREATE INDEX IF NOT EXISTS idx_raw_batch_registry_status
    ON ctb.raw_batch_registry (status);

CREATE INDEX IF NOT EXISTS idx_raw_batch_registry_supersedes
    ON ctb.raw_batch_registry (supersedes_batch_id)
    WHERE supersedes_batch_id IS NOT NULL;

-- Batch registry immutability: INSERT-only except status transitions
CREATE OR REPLACE FUNCTION ctb.enforce_batch_registry_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ctb, pg_catalog
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'CTB_BATCH_IMMUTABILITY: DELETE on ctb.raw_batch_registry is not allowed. '
                        'Batch records are permanent. '
                        'Doctrine: CTB_REGISTRY_ENFORCEMENT.md §8.3';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- Only the status column may change
        IF OLD.batch_id != NEW.batch_id
           OR OLD.bridge_id != NEW.bridge_id
           OR OLD.vendor_source != NEW.vendor_source
           OR OLD.bridge_version != NEW.bridge_version
           OR OLD.target_schema != NEW.target_schema
           OR OLD.target_table != NEW.target_table
           OR OLD.row_count != NEW.row_count
           OR OLD.ingested_at != NEW.ingested_at
           OR OLD.ingested_by != NEW.ingested_by
           OR (OLD.supersedes_batch_id IS DISTINCT FROM NEW.supersedes_batch_id)
        THEN
            RAISE EXCEPTION 'CTB_BATCH_IMMUTABILITY: Only the status column may be updated on ctb.raw_batch_registry. '
                            'All other columns are immutable after insertion. '
                            'Doctrine: CTB_REGISTRY_ENFORCEMENT.md §8.3';
        END IF;

        IF OLD.status != 'ACTIVE' THEN
            RAISE EXCEPTION 'CTB_BATCH_IMMUTABILITY: Batch % status is %, only ACTIVE batches may transition. '
                            'Doctrine: CTB_REGISTRY_ENFORCEMENT.md §8.3',
                            OLD.batch_id, OLD.status;
        END IF;

        IF NEW.status NOT IN ('SUPERSEDED', 'FAILED') THEN
            RAISE EXCEPTION 'CTB_BATCH_IMMUTABILITY: Invalid status transition ACTIVE -> %. '
                            'Allowed: ACTIVE -> SUPERSEDED, ACTIVE -> FAILED. '
                            'Doctrine: CTB_REGISTRY_ENFORCEMENT.md §8.3',
                            NEW.status;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION ctb.enforce_batch_registry_immutability() IS 'Enforces INSERT-only on batch registry (except status transitions)';

DROP TRIGGER IF EXISTS trg_batch_registry_immutability ON ctb.raw_batch_registry;
CREATE TRIGGER trg_batch_registry_immutability
    BEFORE UPDATE OR DELETE ON ctb.raw_batch_registry
    FOR EACH ROW EXECUTE FUNCTION ctb.enforce_batch_registry_immutability();

-- Auto-supersede previous batch
CREATE OR REPLACE FUNCTION ctb.auto_supersede_batch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ctb, pg_catalog
AS $$
BEGIN
    IF NEW.supersedes_batch_id IS NOT NULL THEN
        UPDATE ctb.raw_batch_registry
        SET status = 'SUPERSEDED'
        WHERE batch_id = NEW.supersedes_batch_id
          AND status = 'ACTIVE';

        IF NOT FOUND THEN
            RAISE WARNING 'CTB_BATCH_SUPERSEDE: Batch % not found or not ACTIVE — cannot supersede',
                          NEW.supersedes_batch_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION ctb.auto_supersede_batch() IS 'Auto-marks the previous batch as SUPERSEDED when a new batch references it';

DROP TRIGGER IF EXISTS trg_auto_supersede ON ctb.raw_batch_registry;
CREATE TRIGGER trg_auto_supersede
    AFTER INSERT ON ctb.raw_batch_registry
    FOR EACH ROW EXECUTE FUNCTION ctb.auto_supersede_batch();

-- Batch audit log
CREATE TABLE IF NOT EXISTS ctb.batch_audit_log (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    batch_id        UUID NOT NULL,
    old_status      TEXT,
    new_status      TEXT NOT NULL,
    changed_by      TEXT NOT NULL DEFAULT current_user,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ctb.batch_audit_log IS 'Audit trail for batch status transitions';

CREATE INDEX IF NOT EXISTS idx_batch_audit_batch
    ON ctb.batch_audit_log (batch_id);

CREATE OR REPLACE FUNCTION ctb.audit_batch_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ctb, pg_catalog
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO ctb.batch_audit_log (batch_id, new_status)
        VALUES (NEW.batch_id, NEW.status);
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO ctb.batch_audit_log (batch_id, old_status, new_status)
        VALUES (NEW.batch_id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION ctb.audit_batch_changes() IS 'Logs batch registry inserts and status transitions to audit log';

DROP TRIGGER IF EXISTS trg_audit_batch ON ctb.raw_batch_registry;
CREATE TRIGGER trg_audit_batch
    AFTER INSERT OR UPDATE ON ctb.raw_batch_registry
    FOR EACH ROW EXECUTE FUNCTION ctb.audit_batch_changes();


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4: RAW Active View Helpers (from template 007)
-- Helper functions for _active views and RAW column validation.
-- Doctrine: CTB_REGISTRY_ENFORCEMENT.md §8.4
-- ═══════════════════════════════════════════════════════════════════════════════

-- Helper: create _active view for a STAGING table
CREATE OR REPLACE FUNCTION ctb.create_raw_active_view(
    p_schema TEXT,
    p_table TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ctb, pg_catalog
AS $$
DECLARE
    view_name TEXT;
    full_table TEXT;
    full_view TEXT;
BEGIN
    view_name := p_table || '_active';
    full_table := quote_ident(p_schema) || '.' || quote_ident(p_table);
    full_view := quote_ident(p_schema) || '.' || quote_ident(view_name);

    IF NOT EXISTS (
        SELECT 1 FROM ctb.table_registry
        WHERE table_schema = p_schema
          AND table_name = p_table
          AND leaf_type = 'STAGING'
    ) THEN
        RAISE EXCEPTION 'CTB_RAW_ACTIVE: Table %.% is not registered as STAGING in ctb.table_registry. '
                        'Only STAGING (RAW) tables require _active views. '
                        'Doctrine: CTB_REGISTRY_ENFORCEMENT.md §8.4',
                        p_schema, p_table;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = p_schema
          AND table_name = p_table
          AND column_name = 'ingestion_batch_id'
    ) THEN
        RAISE EXCEPTION 'CTB_RAW_ACTIVE: Table %.% is missing required column ingestion_batch_id. '
                        'RAW tables must have ingestion_batch_id for batch tracking. '
                        'Doctrine: CTB_REGISTRY_ENFORCEMENT.md §8.2',
                        p_schema, p_table;
    END IF;

    EXECUTE format(
        'CREATE OR REPLACE VIEW %s AS '
        'SELECT r.* '
        'FROM %s r '
        'INNER JOIN ctb.raw_batch_registry b '
        '    ON b.batch_id = r.ingestion_batch_id '
        'WHERE b.status = ''ACTIVE''',
        full_view, full_table
    );

    RAISE NOTICE 'CTB raw_active view created: %', full_view;
END;
$$;

COMMENT ON FUNCTION ctb.create_raw_active_view(TEXT, TEXT) IS 'Helper: create a _active view for a STAGING (RAW) table that filters to ACTIVE batches only';

-- Validation: check all STAGING tables have _active views
CREATE OR REPLACE FUNCTION ctb.validate_raw_active_views()
RETURNS TABLE (
    table_schema TEXT,
    table_name TEXT,
    expected_view TEXT,
    has_view BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ctb, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tr.table_schema,
        tr.table_name,
        (tr.table_name || '_active')::TEXT AS expected_view,
        EXISTS (
            SELECT 1 FROM information_schema.views v
            WHERE v.table_schema = tr.table_schema
              AND v.table_name = tr.table_name || '_active'
        ) AS has_view
    FROM ctb.table_registry tr
    WHERE tr.leaf_type = 'STAGING'
    ORDER BY tr.table_schema, tr.table_name;
END;
$$;

COMMENT ON FUNCTION ctb.validate_raw_active_views() IS 'Returns all STAGING tables and whether they have a companion _active view';

-- Validation: check RAW table has required columns
CREATE OR REPLACE FUNCTION ctb.validate_raw_columns(
    p_schema TEXT,
    p_table TEXT
)
RETURNS TABLE (
    required_column TEXT,
    present BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ctb, pg_catalog
AS $$
DECLARE
    required_cols TEXT[] := ARRAY[
        'ingestion_batch_id',
        'vendor_source',
        'bridge_version',
        'supersedes_batch_id',
        'created_at'
    ];
    col TEXT;
BEGIN
    FOREACH col IN ARRAY required_cols LOOP
        required_column := col;
        present := EXISTS (
            SELECT 1 FROM information_schema.columns ic
            WHERE ic.table_schema = p_schema
              AND ic.table_name = p_table
              AND ic.column_name = col
        );
        RETURN NEXT;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION ctb.validate_raw_columns(TEXT, TEXT) IS 'Validates a RAW table has all 5 required columns per §8.2';


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 5: Vendor Table Validation (from template 008)
-- Validation function for vendor_claude_* tables.
-- Template table itself is NOT deployed (reference only).
-- Doctrine: CTB_REGISTRY_ENFORCEMENT.md §9.1
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION ctb.validate_vendor_table(
    p_schema TEXT,
    p_table TEXT
)
RETURNS TABLE (
    required_column TEXT,
    expected_type TEXT,
    present BOOLEAN,
    type_match BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ctb, pg_catalog
AS $$
DECLARE
    required_cols TEXT[][] := ARRAY[
        ARRAY['id', 'uuid'],
        ARRAY['ingestion_batch_id', 'uuid'],
        ARRAY['tool_name', 'text'],
        ARRAY['payload_json', 'jsonb'],
        ARRAY['created_at', 'timestamp with time zone']
    ];
    i INTEGER;
BEGIN
    IF p_table NOT LIKE 'vendor_claude_%' THEN
        RAISE WARNING 'CTB_VENDOR: Table %.% does not follow vendor_claude_<subhub> naming convention',
                      p_schema, p_table;
    END IF;

    FOR i IN 1..array_length(required_cols, 1) LOOP
        required_column := required_cols[i][1];
        expected_type := required_cols[i][2];

        SELECT
            EXISTS(
                SELECT 1 FROM information_schema.columns ic
                WHERE ic.table_schema = p_schema
                  AND ic.table_name = p_table
                  AND ic.column_name = required_cols[i][1]
            ),
            EXISTS(
                SELECT 1 FROM information_schema.columns ic
                WHERE ic.table_schema = p_schema
                  AND ic.table_name = p_table
                  AND ic.column_name = required_cols[i][1]
                  AND ic.data_type = required_cols[i][2]
            )
        INTO present, type_match;

        RETURN NEXT;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION ctb.validate_vendor_table(TEXT, TEXT) IS
    'Validates a vendor table has required columns per §9.1';


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 6: Bridge Function Validation (from template 009)
-- Validation function for frozen bridge functions.
-- Template bridge function itself is NOT deployed (reference only).
-- Doctrine: CTB_REGISTRY_ENFORCEMENT.md §9.2
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION ctb.validate_bridge_function(
    p_function_name TEXT
)
RETURNS TABLE (
    check_name TEXT,
    passed BOOLEAN,
    detail TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ctb, pg_catalog
AS $$
DECLARE
    func_source TEXT;
BEGIN
    SELECT prosrc INTO func_source
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'ctb'
      AND p.proname = p_function_name;

    IF func_source IS NULL THEN
        check_name := 'function_exists';
        passed := false;
        detail := 'Function ctb.' || p_function_name || ' not found';
        RETURN NEXT;
        RETURN;
    END IF;

    check_name := 'bridge_version_constant';
    passed := func_source LIKE '%BRIDGE_VERSION CONSTANT TEXT%';
    detail := CASE WHEN passed THEN 'Found BRIDGE_VERSION constant' ELSE 'Missing BRIDGE_VERSION constant' END;
    RETURN NEXT;

    check_name := 'bridge_id_constant';
    passed := func_source LIKE '%BRIDGE_ID CONSTANT TEXT%';
    detail := CASE WHEN passed THEN 'Found BRIDGE_ID constant' ELSE 'Missing BRIDGE_ID constant' END;
    RETURN NEXT;

    check_name := 'no_dynamic_iteration';
    passed := NOT (func_source LIKE '%jsonb_each%' OR func_source LIKE '%jsonb_object_keys%');
    detail := CASE WHEN passed THEN 'No dynamic JSON iteration found' ELSE 'PROHIBITED: dynamic JSON iteration detected' END;
    RETURN NEXT;

    check_name := 'has_exception_handling';
    passed := func_source LIKE '%RAISE EXCEPTION%';
    detail := CASE WHEN passed THEN 'Has explicit error handling' ELSE 'Missing RAISE EXCEPTION for validation' END;
    RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION ctb.validate_bridge_function(TEXT) IS
    'Validates a bridge function has required metadata and follows §9.2 rules';


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 7: Role Separation (from templates 010, 011)
-- Creates governance roles for vendor writing, data reading, bridge execution,
-- and the master application role.
-- Doctrine: CTB_REGISTRY_ENFORCEMENT.md §9.1, §9.2, §10
-- NOTE: Roles are cluster-wide in PostgreSQL. On Neon, verify role permissions.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Role: ctb_vendor_writer (INSERT vendor tables, EXECUTE bridges)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ctb_vendor_writer') THEN
        CREATE ROLE ctb_vendor_writer NOLOGIN;
        COMMENT ON ROLE ctb_vendor_writer IS
            'CTB vendor writer — INSERT into vendor tables, EXECUTE bridges. '
            'No direct RAW/SUPPORTING/CANONICAL access. §9.1';
    END IF;
END
$$;

-- Role: ctb_data_reader (SELECT from _active views, SUPPORTING, CANONICAL)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ctb_data_reader') THEN
        CREATE ROLE ctb_data_reader NOLOGIN;
        COMMENT ON ROLE ctb_data_reader IS
            'CTB data reader — SELECT from _active views, SUPPORTING, CANONICAL. '
            'No write access. No vendor table access. §9.4';
    END IF;
END
$$;

-- Role: ctb_bridge_executor (EXECUTE bridges, RAW writes via SECURITY DEFINER)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ctb_bridge_executor') THEN
        CREATE ROLE ctb_bridge_executor NOLOGIN;
        COMMENT ON ROLE ctb_bridge_executor IS
            'CTB bridge executor — can execute bridge functions. '
            'RAW writes happen via SECURITY DEFINER in bridge. §9.2';
    END IF;
END
$$;

-- Role: ctb_app_role (master application role — non-superuser)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ctb_app_role') THEN
        CREATE ROLE ctb_app_role
            NOLOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            NOBYPASSRLS;
        COMMENT ON ROLE ctb_app_role IS
            'CTB application role — non-superuser, limited to vendor INSERT, '
            'bridge EXECUTE, and _active view SELECT. All database-level '
            'governance (event triggers, write guards, immutability) fires '
            'for this role. §10';
    END IF;
END
$$;

-- Validation: role separation for a sub-hub
CREATE OR REPLACE FUNCTION ctb.validate_role_separation(
    p_schema TEXT,
    p_subhub TEXT
)
RETURNS TABLE (
    check_name TEXT,
    passed BOOLEAN,
    detail TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ctb, pg_catalog
AS $$
DECLARE
    vendor_table TEXT;
    raw_table TEXT;
BEGIN
    vendor_table := 'vendor_claude_' || p_subhub;
    raw_table := 'raw_' || p_subhub;

    check_name := 'vendor_writer_role_exists';
    passed := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ctb_vendor_writer');
    detail := CASE WHEN passed THEN 'Role ctb_vendor_writer exists' ELSE 'Role ctb_vendor_writer missing' END;
    RETURN NEXT;

    check_name := 'data_reader_role_exists';
    passed := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ctb_data_reader');
    detail := CASE WHEN passed THEN 'Role ctb_data_reader exists' ELSE 'Role ctb_data_reader missing' END;
    RETURN NEXT;

    check_name := 'vendor_table_exists';
    passed := EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = p_schema AND table_name = vendor_table
    );
    detail := CASE WHEN passed THEN p_schema || '.' || vendor_table || ' exists'
                   ELSE p_schema || '.' || vendor_table || ' not found' END;
    RETURN NEXT;

    check_name := 'raw_table_exists';
    passed := EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = p_schema AND table_name = raw_table
    );
    detail := CASE WHEN passed THEN p_schema || '.' || raw_table || ' exists'
                   ELSE p_schema || '.' || raw_table || ' not found' END;
    RETURN NEXT;

    check_name := 'vendor_has_jsonb';
    passed := EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = p_schema
          AND table_name = vendor_table
          AND data_type = 'jsonb'
    );
    detail := CASE WHEN passed THEN 'Vendor table has JSONB column (correct)'
                   ELSE 'Vendor table missing JSONB column' END;
    RETURN NEXT;

    check_name := 'raw_no_json';
    passed := NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = p_schema
          AND table_name = raw_table
          AND data_type IN ('jsonb', 'json')
    );
    detail := CASE WHEN passed THEN 'RAW table has no JSON columns (correct)'
                   ELSE 'VIOLATION: RAW table contains JSON columns' END;
    RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION ctb.validate_role_separation(TEXT, TEXT) IS
    'Validates role separation and JSON containment for a sub-hub. §9.1, §9.2';

-- Validation: application role enforcement
CREATE OR REPLACE FUNCTION ctb.validate_application_role()
RETURNS TABLE (
    check_name TEXT,
    passed BOOLEAN,
    detail TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ctb, pg_catalog
AS $$
DECLARE
    v_is_superuser BOOLEAN;
    v_current_user TEXT;
BEGIN
    v_current_user := current_user;

    check_name := 'app_role_exists';
    passed := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ctb_app_role');
    detail := CASE WHEN passed
        THEN 'Role ctb_app_role exists'
        ELSE 'VIOLATION: Role ctb_app_role does not exist — run migration 016'
    END;
    RETURN NEXT;

    check_name := 'not_postgres_user';
    passed := (v_current_user <> 'postgres');
    detail := CASE WHEN passed
        THEN 'Connected as ' || v_current_user || ' (not postgres)'
        ELSE 'VIOLATION: Connected as postgres — application code must use ctb_app_role'
    END;
    RETURN NEXT;

    check_name := 'not_superuser';
    SELECT usesuper INTO v_is_superuser
    FROM pg_user WHERE usename = v_current_user;
    passed := NOT COALESCE(v_is_superuser, false);
    detail := CASE WHEN passed
        THEN 'User ' || v_current_user || ' is not a superuser (governance triggers will fire)'
        ELSE 'VIOLATION: User ' || v_current_user || ' has superuser privileges — ALL database governance is INERT'
    END;
    RETURN NEXT;

    check_name := 'app_role_not_superuser';
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ctb_app_role') THEN
        passed := NOT (SELECT rolsuper FROM pg_roles WHERE rolname = 'ctb_app_role');
        detail := CASE WHEN passed
            THEN 'ctb_app_role is NOSUPERUSER (correct)'
            ELSE 'VIOLATION: ctb_app_role has superuser — this defeats all governance'
        END;
    ELSE
        passed := false;
        detail := 'Cannot check — ctb_app_role does not exist';
    END IF;
    RETURN NEXT;

    check_name := 'app_role_no_createdb';
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ctb_app_role') THEN
        passed := NOT (SELECT rolcreatedb FROM pg_roles WHERE rolname = 'ctb_app_role');
        detail := CASE WHEN passed
            THEN 'ctb_app_role is NOCREATEDB (correct)'
            ELSE 'VIOLATION: ctb_app_role can create databases'
        END;
    ELSE
        passed := false;
        detail := 'Cannot check — ctb_app_role does not exist';
    END IF;
    RETURN NEXT;

    check_name := 'app_role_no_createrole';
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ctb_app_role') THEN
        passed := NOT (SELECT rolcreaterole FROM pg_roles WHERE rolname = 'ctb_app_role');
        detail := CASE WHEN passed
            THEN 'ctb_app_role is NOCREATEROLE (correct)'
            ELSE 'VIOLATION: ctb_app_role can create roles'
        END;
    ELSE
        passed := false;
        detail := 'Cannot check — ctb_app_role does not exist';
    END IF;
    RETURN NEXT;

    check_name := 'app_role_no_bypassrls';
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ctb_app_role') THEN
        passed := NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'ctb_app_role');
        detail := CASE WHEN passed
            THEN 'ctb_app_role is NOBYPASSRLS (correct)'
            ELSE 'VIOLATION: ctb_app_role can bypass RLS'
        END;
    ELSE
        passed := false;
        detail := 'Cannot check — ctb_app_role does not exist';
    END IF;
    RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION ctb.validate_application_role() IS
    'Validates that the application is NOT running as superuser and that '
    'ctb_app_role exists with restricted privileges. CRITICAL: If application '
    'connects as superuser, ALL database-level governance is silently inert. §10';


-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '  CTB ADVANCED GOVERNANCE — MIGRATION 016 COMPLETE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '  Tables created:';
    RAISE NOTICE '    ctb.vendor_bridges            [vendor bridge registry]';
    RAISE NOTICE '    ctb.raw_batch_registry        [batch tracking]';
    RAISE NOTICE '    ctb.batch_audit_log            [batch audit trail]';
    RAISE NOTICE '  Functions created:';
    RAISE NOTICE '    ctb.enforce_immutability()      [INSERT-only guard]';
    RAISE NOTICE '    ctb.create_immutability_guard() [attach helper]';
    RAISE NOTICE '    ctb.remove_immutability_guard() [detach helper]';
    RAISE NOTICE '    ctb.enforce_batch_registry_immutability() [batch guard]';
    RAISE NOTICE '    ctb.auto_supersede_batch()      [auto-supersede]';
    RAISE NOTICE '    ctb.audit_batch_changes()       [batch audit]';
    RAISE NOTICE '    ctb.create_raw_active_view()    [_active view helper]';
    RAISE NOTICE '    ctb.validate_raw_active_views() [validation]';
    RAISE NOTICE '    ctb.validate_raw_columns()      [RAW column check]';
    RAISE NOTICE '    ctb.validate_vendor_table()     [vendor structure check]';
    RAISE NOTICE '    ctb.validate_bridge_function()  [bridge compliance check]';
    RAISE NOTICE '    ctb.validate_role_separation()  [role separation check]';
    RAISE NOTICE '    ctb.validate_application_role() [superuser detection]';
    RAISE NOTICE '  Roles created:';
    RAISE NOTICE '    ctb_vendor_writer    [vendor INSERT + bridge EXECUTE]';
    RAISE NOTICE '    ctb_data_reader      [SELECT _active + SUPPORTING + CANONICAL]';
    RAISE NOTICE '    ctb_bridge_executor  [bridge execution]';
    RAISE NOTICE '    ctb_app_role         [master app role — NOSUPERUSER]';
    RAISE NOTICE '  Triggers:';
    RAISE NOTICE '    trg_batch_registry_immutability (on ctb.raw_batch_registry)';
    RAISE NOTICE '    trg_auto_supersede (on ctb.raw_batch_registry)';
    RAISE NOTICE '    trg_audit_batch (on ctb.raw_batch_registry)';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '  Use helpers to attach guards to individual tables:';
    RAISE NOTICE '    SELECT ctb.create_immutability_guard(schema, table);';
    RAISE NOTICE '    SELECT ctb.create_write_guard(schema, table);';
    RAISE NOTICE '    SELECT ctb.create_promotion_guard(schema, table);';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END;
$$;
