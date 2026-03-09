-- Migration 009: Create lcs.bridge_signal_output() function
-- Work Packet: wp-20260304-bridge-signal-output-to-lcs-queue
-- Direction: FORWARD
-- Bridges outreach.signal_output into lcs.signal_queue with duplicate detection
-- and signal_code->signal_set_hash mapping from lcs.signal_registry.
-- BLOCKER: outreach.signal_output does not yet exist in Neon.
-- Function includes runtime guard — returns empty result set until source table is migrated.

BEGIN;

CREATE OR REPLACE FUNCTION lcs.bridge_signal_output()
RETURNS TABLE(
    source_hub TEXT,
    signals_found INTEGER,
    signals_inserted INTEGER,
    signals_skipped INTEGER,
    blocker_note TEXT
)
LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
DECLARE
    v_found INT := 0;
    v_inserted INT := 0;
    v_blocker TEXT := NULL;
BEGIN

    -- ═══ GUARD: outreach.signal_output must exist ══════════
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'outreach' AND table_name = 'signal_output'
    ) THEN
        v_blocker := 'BLOCKED — outreach.signal_output does not exist. Source: outreach hub migration required.';
        RETURN QUERY SELECT
            'OUTREACH'::TEXT, 0, 0, 0, v_blocker;
        RETURN;
    END IF;

    -- ═══ BRIDGE: outreach.signal_output → lcs.signal_queue ═
    WITH source_signals AS (
        SELECT
            so.id AS source_signal_id,
            so.sovereign_company_id,
            so.signal_code,
            so.signal_category,
            so.lifecycle_phase,
            so.preferred_channel,
            so.preferred_lane,
            so.signal_data,
            so.run_month,
            so.priority,
            sr.signal_set_hash
        FROM outreach.signal_output so
        JOIN cl.company_identity ci
            ON ci.company_unique_id = so.sovereign_company_id
        JOIN lcs.signal_registry sr
            ON sr.signal_name = so.signal_code
            AND sr.is_active = true
        WHERE ci.final_outcome = 'PASS'
          -- Duplicate detection: sovereign_company_id + source_signal_id
          AND NOT EXISTS (
              SELECT 1 FROM lcs.signal_queue sq
              WHERE sq.source_hub = 'OUTREACH'
                AND sq.source_signal_id = so.id
                AND sq.status IN ('PENDING', 'COMPLETED')
          )
          -- Duplicate detection: signal_set_hash + run_month
          AND NOT EXISTS (
              SELECT 1 FROM lcs.signal_queue sq
              WHERE sq.source_hub = 'OUTREACH'
                AND sq.signal_set_hash = sr.signal_set_hash
                AND sq.sovereign_company_id = so.sovereign_company_id
                AND sq.created_at >= date_trunc('month', so.run_month::date)
                AND sq.created_at < date_trunc('month', so.run_month::date) + interval '1 month'
                AND sq.status IN ('PENDING', 'COMPLETED')
          )
    ),
    inserted AS (
        INSERT INTO lcs.signal_queue (
            signal_set_hash, signal_category,
            sovereign_company_id, lifecycle_phase,
            preferred_channel, preferred_lane,
            signal_data, source_hub, source_signal_id,
            status, priority
        )
        SELECT
            signal_set_hash,
            signal_category,
            sovereign_company_id,
            lifecycle_phase,
            preferred_channel,
            preferred_lane,
            signal_data,
            'OUTREACH',
            source_signal_id,
            'PENDING',
            COALESCE(priority, 0)
        FROM source_signals
        ON CONFLICT (source_hub, source_signal_id)
            WHERE source_signal_id IS NOT NULL AND status = 'PENDING'
            DO NOTHING
        RETURNING 1
    )
    SELECT
        (SELECT count(*) FROM source_signals),
        (SELECT count(*) FROM inserted)
    INTO v_found, v_inserted;

    RETURN QUERY SELECT
        'OUTREACH'::TEXT,
        v_found,
        v_inserted,
        (v_found - v_inserted),
        NULL::TEXT;

END;
$function$;

COMMENT ON FUNCTION lcs.bridge_signal_output() IS
    'Bridges outreach.signal_output into lcs.signal_queue. '
    'Duplicate detection: (sovereign_company_id + source_signal_id) OR (signal_set_hash + run_month). '
    'Maps signal_code to signal_set_hash via lcs.signal_registry. '
    'Returns blocker note if outreach.signal_output is absent.';

COMMIT;
