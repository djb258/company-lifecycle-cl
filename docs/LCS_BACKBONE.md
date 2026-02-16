# LCS Backbone

**Authority**: HUB-CL-001, SUBHUB-CL-LCS
**Migrations**: `neon/migrations/009_lcs_backbone.sql`, `010_lcs_cadence_expansion.sql`
**Worker**: `src/runtime/lcs/lcs-queue-worker.ts`

## What Was Built

Phase 1 skeleton for the Lifecycle Communication System (LCS) sub-hub under CL.
No adapter logic, no AI composer, no domain rotation. Just the structural backbone.

### ENUMs (5)

| Type | Values |
|------|--------|
| `cl.lifecycle_stage` | INVENTORY, OUTREACH, SALES, CLIENT, DORMANT |
| `cl.communication_class` | OUTREACH, SALES, CLIENT |
| `cl.channel_type` | EMAIL, LINKEDIN |
| `cl.signal_status` | QUEUED, PROCESSED, REJECTED, ERROR |
| `cl.ledger_status` | APPROVED, BLOCKED, SENT, FAILED |

### Tables (8)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `cl.lcs_communication_ledger` | Canonical ledger | ledger_id, sovereign_company_id, communication_id, message_id, status |
| `cl.lcs_errors` | Error log | error_id, error_code, error_detail |
| `cl.lcs_signal_queue` | Signal intake queue | signal_id, proposed_communication_id, status |
| `cl.lcs_communication_registry` | Known communication types | communication_id, communication_class, allowed_stages |
| `cl.lcs_diagnostic_code_registry` | Diagnostic codes | diagnostic_code, active_flag |
| `cl.lcs_cadence_registry` | Step cadence definitions | cadence_id, communication_id (FK), step_offsets_days |
| `cl.lcs_adapter_registry` | Delivery adapters | adapter_id, channel_type |
| `cl.lcs_suppression_registry` | Company suppression list | sovereign_company_id, suppressed_flag |

### Stored Procedure

`cl.lcs_attempt_send(p_signal_id UUID)` returns JSON.

Fail-closed pipeline:
1. Lock signal row; reject if not QUEUED
2. Lookup company, derive lifecycle_stage from pointer columns
3. Company not found -> ERROR + lcs_errors row
4. Validate communication_id in registry (exists, active, class matches, stage allowed)
5. Suppression check
6. 7-day one-active guard (same communication_class)
7. Resolve cadence from `lcs_cadence_registry` (default: single-step `{0}`)
8. Expand cadence into N ledger rows with `scheduled_for` per step
9. Mark signal PROCESSED
10. Return `{decision, cadence_instance_id, ledger_ids, message_ids, reason}`

### Seed Data

Communication registry ships with 5 rows:

| communication_id | class | allowed_stages |
|-----------------|-------|----------------|
| OUTREACH_BASELINE | OUTREACH | {OUTREACH} |
| OUTREACH_ESCALATION | OUTREACH | {OUTREACH} |
| SALES_FOLLOWUP | SALES | {SALES} |
| CLIENT_EXECUTIVE_MONTHLY | CLIENT | {CLIENT} |
| CLIENT_EMPLOYEE_NOTICE | CLIENT | {CLIENT} |

## Cadence Expansion (Phase 2)

**Migration**: `010_lcs_cadence_expansion.sql`

### How it works

When a QUEUED signal passes all validations, `lcs_attempt_send()` expands it into N scheduled ledger rows based on the cadence registry:

1. Lookup active cadence for the `proposed_communication_id` in `lcs_cadence_registry`
2. If no cadence exists, default to single-step immediate: `{0}`
3. Mint a `cadence_instance_id` (UUID) grouping all rows from this signal
4. For each offset in `step_offsets_days`, insert a ledger row with:
   - `step_number` = 1-indexed position in the array
   - `scheduled_for` = `now() + (offset_days * interval '1 day')`
   - `message_id` = `{communication_id}__{signal_id}__{step_number}`

### ID semantics

| ID | Scope | Example |
|----|-------|---------|
| `communication_id` | The communication type (from registry) | `OUTREACH_BASELINE` |
| `cadence_instance_id` | Groups all steps from one signal expansion | UUID |
| `message_id` | Unique per step per signal | `OUTREACH_BASELINE__<signal_uuid>__1` |

### `scheduled_for` semantics

- `scheduled_for` is the **earliest eligible send time** for that ledger row.
- Future adapters will only act on rows matching: `status = 'APPROVED' AND scheduled_for <= now()`
- LCS pre-authorizes the entire cadence at signal processing time (Option A). All steps are written immediately with future `scheduled_for` timestamps.

### Example: 3-step cadence

Cadence registry row: `step_offsets_days = {0, 5, 12}`

One signal produces 3 ledger rows:

| step_number | scheduled_for | message_id |
|-------------|---------------|------------|
| 1 | now() | `OUTREACH_BASELINE__<sid>__1` |
| 2 | now() + 5 days | `OUTREACH_BASELINE__<sid>__2` |
| 3 | now() + 12 days | `OUTREACH_BASELINE__<sid>__3` |

All share the same `cadence_instance_id`.

## Running the Worker

```bash
# Set connection string
export DATABASE_URL="postgresql://..."

# Run (processes one batch, exits)
npx tsx src/runtime/lcs/lcs-queue-worker.ts

# Custom batch size
LCS_BATCH_SIZE=25 npx tsx src/runtime/lcs/lcs-queue-worker.ts
```

## Running the Migration

```bash
psql $DATABASE_URL -f neon/migrations/009_lcs_backbone.sql
```

## Test Scenarios

### 1. Happy Path (OUTREACH company + OUTREACH_BASELINE signal)

```sql
-- Ensure company exists with outreach pointer
UPDATE cl.company_identity
   SET outreach_id = gen_random_uuid()
 WHERE company_unique_id = '<test_company_id>';

-- Insert signal
INSERT INTO cl.lcs_signal_queue (sovereign_company_id, proposed_communication_id, communication_class, source_hub)
VALUES ('<test_company_id>', 'OUTREACH_BASELINE', 'OUTREACH', 'OUTREACH');

-- Run worker, expect:
-- signal -> PROCESSED
-- ledger row with status=APPROVED
```

### 2. Suppression (suppressed company -> BLOCKED)

```sql
-- Add suppression
INSERT INTO cl.lcs_suppression_registry (sovereign_company_id, reason)
VALUES ('<test_company_id>', 'Manual suppression test');

-- Insert signal
INSERT INTO cl.lcs_signal_queue (sovereign_company_id, proposed_communication_id, communication_class, source_hub)
VALUES ('<test_company_id>', 'OUTREACH_BASELINE', 'OUTREACH', 'OUTREACH');

-- Run worker, expect:
-- signal -> REJECTED
-- NO ledger row created
-- decision = BLOCKED, reason = SUPPRESSED
```

### 3. Cadence Expansion (3-step cadence -> 3 ledger rows)

```sql
-- Create a cadence for OUTREACH_BASELINE
INSERT INTO cl.lcs_cadence_registry (cadence_id, communication_id, cadence_kind, step_offsets_days)
VALUES ('CAD_OUTREACH_3STEP', 'OUTREACH_BASELINE', 'BASELINE', '{0,5,12}');

-- Insert signal
INSERT INTO cl.lcs_signal_queue (sovereign_company_id, proposed_communication_id, communication_class, source_hub)
VALUES ('<test_company_id>', 'OUTREACH_BASELINE', 'OUTREACH', 'OUTREACH');

-- Run worker, expect:
-- signal -> PROCESSED
-- 3 ledger rows, all APPROVED, same cadence_instance_id
-- step 1: scheduled_for ~ now()
-- step 2: scheduled_for ~ now() + 5 days
-- step 3: scheduled_for ~ now() + 12 days
```

### 4. Missing Company (signal for nonexistent company -> ERROR)

```sql
-- Insert signal with fake company ID
INSERT INTO cl.lcs_signal_queue (sovereign_company_id, proposed_communication_id, communication_class, source_hub)
VALUES ('00000000-0000-0000-0000-000000000000', 'OUTREACH_BASELINE', 'OUTREACH', 'OUTREACH');

-- Run worker, expect:
-- signal -> ERROR
-- lcs_errors row with error_code=COMPANY_NOT_FOUND
-- decision = ERROR
```
