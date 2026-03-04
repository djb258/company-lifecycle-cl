# Worker Briefing — wp-20260304-bridge-signal-output-to-lcs-queue

## Status: DB_COMPLETE_WITH_BLOCKER

## What Was Done

Migration 009 created `lcs.bridge_signal_output()` — a new bridge function that reads from `outreach.signal_output`, maps signal codes via `lcs.signal_registry`, and inserts into `lcs.signal_queue`.

### Function Signature

```sql
lcs.bridge_signal_output()
RETURNS TABLE(
    source_hub TEXT,
    signals_found INTEGER,
    signals_inserted INTEGER,
    signals_skipped INTEGER,
    blocker_note TEXT
)
```

### Flow Contract

```
outreach.signal_output → lcs.bridge_signal_output() → lcs.signal_queue
                              ↕
                    lcs.signal_registry (signal_code → signal_set_hash)
                    cl.company_identity (sovereign verification)
```

### Duplicate Detection (Dual Path)

1. **Identity path**: `sovereign_company_id + source_signal_id` — prevents re-bridging the same source signal
2. **Temporal path**: `signal_set_hash + sovereign_company_id + run_month` — prevents same signal type for same company in same month

### Relationship to bridge_pressure_signals()

- `lcs.bridge_pressure_signals()` — bridges PEOPLE/DOL/BLOG pressure_signals (existing, **not modified**)
- `lcs.bridge_signal_output()` — bridges OUTREACH signal_output (new, coexists alongside)

Both functions target `lcs.signal_queue` but with different `source_hub` values and different source tables.

## BLOCKER

**outreach.signal_output does not exist in Neon.**

The outreach schema currently contains: `outreach.blog`, `outreach.dol`, `outreach.outreach` — but no `signal_output` table.

The function includes a runtime guard:
```sql
SELECT * FROM lcs.bridge_signal_output();
-- Returns: OUTREACH | 0 | 0 | 0 | BLOCKED — outreach.signal_output does not exist...
```

### Resolution Required

Outreach hub must create `outreach.signal_output` with expected columns:

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Source signal identifier |
| sovereign_company_id | UUID | Links to cl.company_identity |
| signal_code | TEXT | Maps to signal_registry.signal_name |
| signal_category | TEXT | Signal classification |
| lifecycle_phase | TEXT | OUTREACH/SALES/CLIENT |
| preferred_channel | TEXT | MG/HR/SH (nullable) |
| preferred_lane | TEXT | MAIN/LANE_A/LANE_B/NEWSLETTER (nullable) |
| signal_data | JSONB | Signal payload |
| run_month | TEXT | YYYY-MM format for temporal dedup |
| priority | INTEGER | 0-2 priority level |

## Pressure Tests

| Report | Score | Result |
|--------|-------|--------|
| ARCH | 5/5 | PASS |
| FLOW | 5/5 | PASS |

## Artifacts

| Artifact | Path |
|----------|------|
| Forward migration | `migrations/009_bridge_signal_output.sql` |
| Rollback migration | `migrations/009_bridge_signal_output_rollback.sql` |
| DB changeset | `changesets/outbox/wp-20260304-bridge-signal-output-to-lcs-queue/db/db_changeset.json` |
| Schema diff | `changesets/outbox/wp-20260304-bridge-signal-output-to-lcs-queue/db/schema_diff.json` |
| ARCH pressure report | `changesets/outbox/wp-20260304-bridge-signal-output-to-lcs-queue/audit/ARCH_PRESSURE_REPORT.json` |
| FLOW pressure report | `changesets/outbox/wp-20260304-bridge-signal-output-to-lcs-queue/audit/FLOW_PRESSURE_REPORT.json` |

## Risk: MED

New function with cross-schema reads. Fully reversible via rollback. Runtime-safe (blocker guard). No data mutations until source table exists.
