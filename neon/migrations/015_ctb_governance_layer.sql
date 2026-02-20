-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 015: CTB Governance Layer
-- ═══════════════════════════════════════════════════════════════════════════════
-- Authority: imo-creator v3.3.0 (Constitutional)
-- Purpose: Apply CTB enforcement functions, DDL gate, write guards,
--          promotion paths to CL's existing ctb schema
-- Source templates: 002_ctb_event_trigger, 003_ctb_write_guards,
--                   004_ctb_promotion_enforcement
-- Depends: ctb.table_registry (already exists from CTB Phase 3)
-- Idempotent: YES (CREATE OR REPLACE, IF NOT EXISTS throughout)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: DDL Event Trigger (from template 002)
-- Blocks CREATE/ALTER/DROP TABLE on unregistered tables
-- Note: Event triggers exempt superusers by design
-- ═══════════════════════════════════════════════════════════════════════════════

-- Function: enforce_table_registration on CREATE/ALTER
CREATE OR REPLACE FUNCTION ctb.enforce_table_registration()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ctb, pg_catalog
AS $$
DECLARE
    obj RECORD;
    tbl_schema TEXT;
    tbl_name TEXT;
    is_registered BOOLEAN;
    is_frozen_val BOOLEAN;
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
    LOOP
        IF obj.object_type != 'table' THEN
            CONTINUE;
        END IF;

        tbl_schema := split_part(obj.object_identity, '.', 1);
        tbl_name := split_part(obj.object_identity, '.', 2);

        -- Skip ctb schema (governance infrastructure)
        IF tbl_schema = 'ctb' THEN
            CONTINUE;
        END IF;

        -- Skip temporary tables
        IF tbl_schema LIKE 'pg_temp%' THEN
            CONTINUE;
        END IF;

        SELECT EXISTS(
            SELECT 1 FROM ctb.table_registry
            WHERE table_registry.table_schema = tbl_schema
              AND table_registry.table_name = tbl_name
        ) INTO is_registered;

        IF NOT is_registered THEN
            RAISE EXCEPTION 'CTB_DDL_GATE: Table %.% is not registered in ctb.table_registry. '
                            'Register FIRST, create SECOND. '
                            'Doctrine: CTB_REGISTRY_ENFORCEMENT.md §4.2',
                            tbl_schema, tbl_name;
        END IF;

        IF obj.command_tag LIKE 'ALTER%' THEN
            SELECT tr.is_frozen INTO is_frozen_val
            FROM ctb.table_registry tr
            WHERE tr.table_schema = tbl_schema
              AND tr.table_name = tbl_name;

            IF is_frozen_val THEN
                RAISE EXCEPTION 'CTB_DDL_GATE: Table %.% is FROZEN — structure cannot be altered.',
                                tbl_schema, tbl_name;
            END IF;
        END IF;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION ctb.enforce_table_registration() IS 'Event trigger: blocks DDL on unregistered tables';

-- Function: enforce_table_drop_registration on DROP
CREATE OR REPLACE FUNCTION ctb.enforce_table_drop_registration()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ctb, pg_catalog
AS $$
DECLARE
    obj RECORD;
    tbl_schema TEXT;
    tbl_name TEXT;
    is_registered BOOLEAN;
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
    LOOP
        IF obj.object_type != 'table' THEN
            CONTINUE;
        END IF;

        tbl_schema := obj.schema_name;
        tbl_name := obj.object_name;

        IF tbl_schema = 'ctb' THEN
            CONTINUE;
        END IF;

        IF tbl_schema LIKE 'pg_temp%' THEN
            CONTINUE;
        END IF;

        SELECT EXISTS(
            SELECT 1 FROM ctb.table_registry
            WHERE table_registry.table_schema = tbl_schema
              AND table_registry.table_name = tbl_name
        ) INTO is_registered;

        IF NOT is_registered THEN
            RAISE EXCEPTION 'CTB_DDL_GATE: Cannot DROP %.% — not registered in ctb.table_registry.',
                            tbl_schema, tbl_name;
        END IF;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION ctb.enforce_table_drop_registration() IS 'Event trigger: blocks DROP on unregistered tables';

-- Event triggers (idempotent via DROP IF EXISTS)
DROP EVENT TRIGGER IF EXISTS ctb_enforce_table_registration;
DROP EVENT TRIGGER IF EXISTS ctb_enforce_table_drop;

CREATE EVENT TRIGGER ctb_enforce_table_registration
    ON ddl_command_end
    WHEN TAG IN ('CREATE TABLE', 'ALTER TABLE')
    EXECUTE FUNCTION ctb.enforce_table_registration();

CREATE EVENT TRIGGER ctb_enforce_table_drop
    ON sql_drop
    WHEN TAG IN ('DROP TABLE')
    EXECUTE FUNCTION ctb.enforce_table_drop_registration();


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: Write Guard Function (from template 003)
-- Row-level trigger function that blocks writes to unregistered/frozen tables
-- Must be attached per-table using: ctb.create_write_guard('schema', 'table')
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION ctb.write_guard_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ctb, pg_catalog
AS $$
DECLARE
    is_registered BOOLEAN;
    is_frozen_val BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM ctb.table_registry
        WHERE table_registry.table_schema = TG_TABLE_SCHEMA
          AND table_registry.table_name = TG_TABLE_NAME
    ) INTO is_registered;

    IF NOT is_registered THEN
        RAISE EXCEPTION 'CTB_WRITE_GUARD: Table %.% is not registered in ctb.table_registry.',
                        TG_TABLE_SCHEMA, TG_TABLE_NAME;
    END IF;

    SELECT tr.is_frozen INTO is_frozen_val
    FROM ctb.table_registry tr
    WHERE tr.table_schema = TG_TABLE_SCHEMA
      AND tr.table_name = TG_TABLE_NAME;

    IF is_frozen_val THEN
        RAISE EXCEPTION 'CTB_WRITE_GUARD: Table %.% is FROZEN — writes are blocked.',
                        TG_TABLE_SCHEMA, TG_TABLE_NAME;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

COMMENT ON FUNCTION ctb.write_guard_check() IS 'Row-level trigger: blocks writes to unregistered or frozen tables';

-- Helper: attach write guard to a table
CREATE OR REPLACE FUNCTION ctb.create_write_guard(
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
    trigger_name := 'trg_ctb_write_guard_' || p_table;
    full_table := quote_ident(p_schema) || '.' || quote_ident(p_table);

    EXECUTE format(
        'DROP TRIGGER IF EXISTS %I ON %s',
        trigger_name, full_table
    );

    EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OR DELETE ON %s '
        'FOR EACH ROW EXECUTE FUNCTION ctb.write_guard_check()',
        trigger_name, full_table
    );

    RAISE NOTICE 'CTB write guard attached to %', full_table;
END;
$$;

COMMENT ON FUNCTION ctb.create_write_guard(TEXT, TEXT) IS 'Helper: attach write guard trigger to a table';


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: Promotion Enforcement (from template 004)
-- Blocks direct writes to CANONICAL tables without declared promotion path
-- ═══════════════════════════════════════════════════════════════════════════════

-- Table: promotion paths
CREATE TABLE IF NOT EXISTS ctb.promotion_paths (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_schema       TEXT NOT NULL DEFAULT 'public',
    source_table        TEXT NOT NULL,
    target_schema       TEXT NOT NULL DEFAULT 'public',
    target_table        TEXT NOT NULL,
    hub_id              TEXT NOT NULL,
    subhub_id           TEXT NOT NULL,
    description         TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          TEXT NOT NULL DEFAULT current_user,

    CONSTRAINT uq_promotion_path UNIQUE (source_schema, source_table, target_schema, target_table)
);

COMMENT ON TABLE ctb.promotion_paths IS 'Declared data flow paths from SUPPORTING → CANONICAL tables';

CREATE INDEX IF NOT EXISTS idx_promotion_paths_target
    ON ctb.promotion_paths (target_schema, target_table);

CREATE INDEX IF NOT EXISTS idx_promotion_paths_source
    ON ctb.promotion_paths (source_schema, source_table);

-- Function: enforce promotion
CREATE OR REPLACE FUNCTION ctb.enforce_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ctb, pg_catalog
AS $$
DECLARE
    target_leaf_type TEXT;
    promotion_source TEXT;
    src_schema TEXT;
    src_table TEXT;
    path_exists BOOLEAN;
BEGIN
    SELECT tr.leaf_type INTO target_leaf_type
    FROM ctb.table_registry tr
    WHERE tr.table_schema = TG_TABLE_SCHEMA
      AND tr.table_name = TG_TABLE_NAME;

    -- If not CANONICAL, allow
    IF target_leaf_type IS NULL OR target_leaf_type != 'CANONICAL' THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- Check promotion source session variable
    BEGIN
        promotion_source := current_setting('ctb.promotion_source', true);
    EXCEPTION WHEN OTHERS THEN
        promotion_source := NULL;
    END;

    IF promotion_source IS NULL OR promotion_source = '' THEN
        RAISE EXCEPTION 'CTB_PROMOTION_GATE: Direct write to CANONICAL table %.% not allowed. '
                        'Set: SET LOCAL ctb.promotion_source = ''schema.source_table'';',
                        TG_TABLE_SCHEMA, TG_TABLE_NAME;
    END IF;

    -- Parse source
    IF position('.' in promotion_source) > 0 THEN
        src_schema := split_part(promotion_source, '.', 1);
        src_table := split_part(promotion_source, '.', 2);
    ELSE
        src_schema := 'public';
        src_table := promotion_source;
    END IF;

    -- Verify path exists
    SELECT EXISTS(
        SELECT 1 FROM ctb.promotion_paths pp
        WHERE pp.source_schema = src_schema
          AND pp.source_table = src_table
          AND pp.target_schema = TG_TABLE_SCHEMA
          AND pp.target_table = TG_TABLE_NAME
          AND pp.is_active = true
    ) INTO path_exists;

    IF NOT path_exists THEN
        RAISE EXCEPTION 'CTB_PROMOTION_GATE: No registered promotion path from %.% to %.%.',
                        src_schema, src_table, TG_TABLE_SCHEMA, TG_TABLE_NAME;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

COMMENT ON FUNCTION ctb.enforce_promotion() IS 'Row-level trigger: blocks direct writes to CANONICAL tables without promotion path';

-- Helper: attach promotion guard to a CANONICAL table
CREATE OR REPLACE FUNCTION ctb.create_promotion_guard(
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
    trigger_name := 'trg_ctb_promotion_' || p_table;
    full_table := quote_ident(p_schema) || '.' || quote_ident(p_table);

    EXECUTE format(
        'DROP TRIGGER IF EXISTS %I ON %s',
        trigger_name, full_table
    );

    EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON %s '
        'FOR EACH ROW EXECUTE FUNCTION ctb.enforce_promotion()',
        trigger_name, full_table
    );

    RAISE NOTICE 'CTB promotion guard attached to %', full_table;
END;
$$;

COMMENT ON FUNCTION ctb.create_promotion_guard(TEXT, TEXT) IS 'Helper: attach promotion enforcement trigger to a CANONICAL table';


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4: Audit log for governance events
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ctb.audit_log (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_type          TEXT NOT NULL,
    table_schema        TEXT,
    table_name          TEXT,
    operation           TEXT,
    process_id          TEXT,
    hub_id              TEXT,
    subhub_id           TEXT,
    details             JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          TEXT NOT NULL DEFAULT current_user
);

COMMENT ON TABLE ctb.audit_log IS 'Governance audit trail — all CTB enforcement events';

CREATE INDEX IF NOT EXISTS idx_audit_log_created
    ON ctb.audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_table
    ON ctb.audit_log (table_schema, table_name);


-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '  CTB GOVERNANCE LAYER — MIGRATION 015 COMPLETE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '  Functions created:';
    RAISE NOTICE '    ctb.enforce_table_registration()     [DDL gate]';
    RAISE NOTICE '    ctb.enforce_table_drop_registration() [DROP gate]';
    RAISE NOTICE '    ctb.write_guard_check()              [write guard]';
    RAISE NOTICE '    ctb.create_write_guard()             [helper]';
    RAISE NOTICE '    ctb.enforce_promotion()              [promotion gate]';
    RAISE NOTICE '    ctb.create_promotion_guard()         [helper]';
    RAISE NOTICE '  Tables created:';
    RAISE NOTICE '    ctb.promotion_paths';
    RAISE NOTICE '    ctb.audit_log';
    RAISE NOTICE '  Event triggers:';
    RAISE NOTICE '    ctb_enforce_table_registration (CREATE/ALTER TABLE)';
    RAISE NOTICE '    ctb_enforce_table_drop (DROP TABLE)';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '  NOTE: Event triggers exempt superusers by design.';
    RAISE NOTICE '  Apply migration 011 to create ctb_app_role for enforcement.';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END;
$$;
