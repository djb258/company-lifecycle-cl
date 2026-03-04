# Worker Briefing — Full DB Lane Summary

**DB Changeset**: db-cs-20260303-lcs-cid-sid-mid-001 (VALID, MED risk)
**Parent Work Packet**: wp-20260303-lcs-cid-sid-mid-pipeline
**DB Sub-Packet**: wp-20260303-lcs-cid-sid-mid-db-changeset (COMPLETE)
**Briefing Version**: 2 (updated 2026-03-03)

---

## DB Lane Status: COMPLETE — ALL APPLIED

All DB artifacts produced. All migrations applied to Neon. Doctrine library migrated. Documentation produced.

### Artifacts Produced

| Artifact | Path | Status |
|----------|------|--------|
| DB_CHANGESET | `changesets/outbox/wp-20260303-lcs-cid-sid-mid-pipeline/db/db_changeset.json` | COMPLETE |
| Forward migration | `migrations/lcs/005_lcs_cid_sid_mid.sql` | APPLIED |
| Rollback migration | `migrations/lcs/005_lcs_cid_sid_mid_rollback.sql` | AVAILABLE |
| Schema diff | `changesets/outbox/wp-20260303-lcs-cid-sid-mid-pipeline/db/schema_diff.json` | COMPLETE |
| Column registry patch | `changesets/outbox/wp-20260303-lcs-cid-sid-mid-pipeline/db/column_registry_patch.yml` | COMPLETE |
| Completion signal | `work_packets/outbox/wp-20260303-lcs-cid-sid-mid-db-changeset.json` | EMITTED |

### Documentation Produced (Type B per DOCUMENTATION_ERD_DOCTRINE v1.0.0)

| Document | Path | Description |
|----------|------|-------------|
| Pipeline Tables | `docs/schema/LCS_CID_SID_MID.md` | Full column dictionaries for lcs.cid, lcs.sid_output, lcs.mid_sequence_state |
| Pipeline ERD | `docs/schema/LCS_PIPELINE_ERD.md` | Mermaid ERD — 8 entities, 9 relationships |
| CTB + Doctrine | `docs/schema/CTB_DOCTRINE_TABLES.md` | ctb.table_registry, doctrine.doctrine_library, doctrine.doctrine_key, doctrine.doctrine_library_error |
| LCS Data Model | `src/sys/lcs/doctrine/LCS_DATA_MODEL.md` | Updated v2.2.0 → v2.3.0 |
| Schema Index | `docs/schema/CL_SCHEMA_INDEX.md` | Updated with all new entries |

### Pre-Deploy Blockers: NONE

All previously identified blockers have been resolved:

| Blocker | Status | Resolution |
|---------|--------|------------|
| ~~Update column_registry.yml~~ | RESOLVED | column_registry_patch.yml applied |
| ~~Apply migration to Neon~~ | RESOLVED | Migration 005 + 005a applied to ep-empty-queen-ai0gmyqg |
| ~~Doctrine library access~~ | RESOLVED | Migrated from research DB (ep-young-block-aii5nj6b) |
| ~~Table registration~~ | RESOLVED | All 20 tables registered in ctb.table_registry |

---

## Neon Database State (ep-empty-queen-ai0gmyqg)

### Schemas

| Schema | Tables | Views/MVs | Purpose |
|--------|--------|-----------|---------|
| cl | 5 | 3 views | Company identity (117k+ rows) |
| lcs | 12 | 3 materialized views | Communication spine + pipeline |
| ctb | 1 | — | Table registry (20 entries) |
| doctrine | 3 | — | Vectorized doctrine (668 chunks, 335 keys) |
| people | 2 (stubs) | — | Cross-hub stubs |
| outreach | 3 (stubs) | — | Cross-hub stubs |
| company | 1 (stub) | — | Cross-hub stub |

### Pipeline Tables (NEW — migration 005)

| Table | Rows | Status |
|-------|------|--------|
| lcs.cid | 1 (test) | APPEND-ONLY, triggers active |
| lcs.sid_output | 0 | APPEND-ONLY, triggers active |
| lcs.mid_sequence_state | 0 | APPEND-ONLY, triggers active |

### Triggers Verified

| Trigger | Table | Purpose |
|---------|-------|---------|
| trg_lcs_cid_no_update | lcs.cid | Append-only enforcement |
| trg_lcs_cid_no_delete | lcs.cid | Append-only enforcement |
| trg_lcs_cid_notify_sid_worker | lcs.cid | pg_notify on COMPILED inserts |
| trg_lcs_sid_output_no_update | lcs.sid_output | Append-only enforcement |
| trg_lcs_sid_output_no_delete | lcs.sid_output | Append-only enforcement |
| trg_lcs_mid_sequence_state_no_update | lcs.mid_sequence_state | Append-only enforcement |
| trg_lcs_mid_sequence_state_no_delete | lcs.mid_sequence_state | Append-only enforcement |

### Extensions

| Extension | Status |
|-----------|--------|
| pgvector | ENABLED (doctrine embeddings, IVFFlat index) |

---

## Schema Contract for Standard Lane

The Worker must write code that agrees with these table structures. All references are by-value (no ORM FKs, no joins at write time).

### lcs.cid — CID Compiler Output

**Purpose**: Origin of every communication. CID compiler mints a `communication_id` by binding signal + company + entity + frame.

| Column | Type | Code Writes? | Notes |
|--------|------|-------------|-------|
| `communication_id` | TEXT | YES — minted by CID compiler | Format: `LCS-{PHASE}-{YYYYMMDD}-{ULID}` |
| `sovereign_company_id` | UUID | YES | From signal_queue or intelligence view |
| `entity_type` | TEXT | YES | `'slot'` or `'person'` |
| `entity_id` | UUID | YES | Resolved entity from people sub-hub |
| `signal_set_hash` | TEXT | YES | From signal_queue entry |
| `signal_queue_id` | UUID | YES | Source signal_queue.id, nullable for manual |
| `frame_id` | TEXT | YES | Matched frame from frame_registry |
| `lifecycle_phase` | TEXT | YES | `'OUTREACH'`, `'SALES'`, `'CLIENT'` |
| `lane` | TEXT | YES | `'MAIN'`, `'LANE_A'`, `'LANE_B'`, `'NEWSLETTER'` |
| `agent_number` | TEXT | YES | Territory agent |
| `intelligence_tier` | INT | YES | 1-5 from v_company_intelligence |
| `compilation_status` | TEXT | YES | `'COMPILED'`, `'FAILED'`, `'BLOCKED'` |
| `compilation_reason` | TEXT | YES | Reason string if not COMPILED |
| `created_at` | TIMESTAMPTZ | NO — DEFAULT NOW() | Immutable |

**Append-only**: INSERT only. UPDATE/DELETE trigger will reject mutations.

### lcs.sid_output — SID Construction Output

**Purpose**: Captures the constructed message after template resolution. One row per compilation.

| Column | Type | Code Writes? | Notes |
|--------|------|-------------|-------|
| `sid_id` | UUID | NO — DEFAULT gen_random_uuid() | Auto PK |
| `communication_id` | TEXT | YES | From lcs.cid |
| `frame_id` | TEXT | YES | Frame used |
| `template_id` | TEXT | YES | Resolved template |
| `subject_line` | TEXT | YES | Constructed subject |
| `body_plain` | TEXT | YES | Plain text body |
| `body_html` | TEXT | YES | HTML body |
| `sender_identity` | TEXT | YES | Sender persona |
| `sender_email` | TEXT | YES | Resolved from-address |
| `recipient_email` | TEXT | YES | Resolved to-address |
| `recipient_name` | TEXT | YES | Resolved name |
| `construction_status` | TEXT | YES | `'CONSTRUCTED'`, `'FAILED'`, `'BLOCKED'` |
| `construction_reason` | TEXT | YES | Reason string if not CONSTRUCTED |
| `created_at` | TIMESTAMPTZ | NO — DEFAULT NOW() | Immutable |

**Append-only**: INSERT only. UPDATE/DELETE trigger will reject mutations.

### lcs.mid_sequence_state — MID Delivery State

**Purpose**: Tracks each delivery attempt through sequencing, gating, and routing. Each attempt = new row.

| Column | Type | Code Writes? | Notes |
|--------|------|-------------|-------|
| `mid_id` | UUID | NO — DEFAULT gen_random_uuid() | Auto PK |
| `message_run_id` | TEXT | YES — minted by MID engine | Format: `RUN-LCS-{PHASE}-{YYYYMMDD}-{ULID}-{CHANNEL}-{ATTEMPT}` |
| `communication_id` | TEXT | YES | From lcs.cid |
| `adapter_type` | TEXT | YES | Routed adapter (`'MG'`, `'HR'`, `'SH'`) |
| `channel` | TEXT | YES | `'MG'`, `'HR'`, `'SH'` |
| `sequence_position` | INT | YES | Position in sequence |
| `attempt_number` | INT | YES | 1-10, default 1 |
| `gate_verdict` | TEXT | YES | `'PASS'`, `'FAIL'`, `'SKIP'` |
| `gate_reason` | TEXT | YES | Reason if FAIL/SKIP |
| `throttle_status` | TEXT | YES | `'CLEAR'`, `'THROTTLED_RECIPIENT'`, etc. |
| `delivery_status` | TEXT | YES | `'PENDING'`, `'QUEUED'`, `'SENT'`, `'DELIVERED'`, `'FAILED'`, `'BOUNCED'` |
| `scheduled_at` | TIMESTAMPTZ | YES | For DELAYED sequences |
| `attempted_at` | TIMESTAMPTZ | YES | When attempt was made |
| `created_at` | TIMESTAMPTZ | NO — DEFAULT NOW() | Immutable |

**Append-only**: INSERT only. Each new attempt = new row with incremented `attempt_number`.

### lcs.frame_registry — New Columns (ALTER)

5 new nullable columns added to the existing frame_registry. Existing seed data unaffected.

| New Column | Type | Purpose |
|------------|------|---------|
| `cid_compilation_rule` | TEXT | `'STANDARD'`, `'STRICT'`, `'LITE'` — controls CID compiler behavior |
| `sid_template_id` | TEXT | Template catalog reference for SID construction |
| `mid_sequence_type` | TEXT | `'IMMEDIATE'`, `'DELAYED'`, `'BATCH'` — controls MID delivery timing |
| `mid_delay_hours` | INT | Delay between sequence steps (0-720), used when DELAYED |
| `mid_max_attempts` | INT | Max delivery attempts per channel (1-10), default 3 |

### Doctrine Library Access (NEW — for SID Worker)

The SID worker can query doctrine content for template resolution:

```sql
-- Semantic search for doctrine chunks
SELECT doctrine_id, section_title, content,
       1 - (embedding <=> $1::vector) AS similarity
FROM doctrine.doctrine_library
WHERE status = 'ACTIVE' AND domain = $2
ORDER BY embedding <=> $1::vector
LIMIT 5;

-- Full-text search for section titles
SELECT domain, major_section, minor_section, section_title, chunk_count
FROM doctrine.doctrine_key
WHERE to_tsvector('english', section_title) @@ plainto_tsquery('english', $1);
```

---

## Pipeline Data Flow (for Worker reference)

```
signal_queue (PENDING)
    ↓ cron picks up
CID Compiler
    ↓ reads: signal_queue + frame_registry + v_company_intelligence
    ↓ writes: lcs.cid (COMPILED | FAILED | BLOCKED)
    ↓ mints: communication_id
    ↓ NOTIFY lcs_sid_worker (on COMPILED)
SID Worker
    ↓ reads: lcs.cid (COMPILED) + frame_registry + doctrine.doctrine_library
    ↓ writes: lcs.sid_output (CONSTRUCTED | FAILED | BLOCKED)
    ↓ resolves: subject, body, sender, recipient
MID Engine
    ↓ reads: lcs.sid_output (CONSTRUCTED) + adapter_registry
    ↓ writes: lcs.mid_sequence_state (gate → route → deliver)
    ↓ mints: message_run_id
    ↓ calls: adapter (MG/HR/SH)
CET (lcs.event)
    ↓ writes: final event record with all IDs
```

---

## ID Minting Contracts

| ID | Minted By | Format | Uniqueness |
|----|-----------|--------|------------|
| `communication_id` | CID Compiler | `LCS-{PHASE}-{YYYYMMDD}-{ULID}` | PK on lcs.cid, carried through all downstream tables |
| `message_run_id` | MID Engine | `RUN-{COMM_ID}-{CHANNEL}-{ATTEMPT}` | Unique per delivery attempt, references communication_id |

Both IDs are by-value references everywhere. No FKs between tables. Each table is independently queryable.

---

## Pressure Test Reports

| Report | Path | Status |
|--------|------|--------|
| ARCH_PRESSURE_REPORT | `changesets/outbox/wp-20260303-lcs-cid-sid-mid-pipeline/audit/ARCH_PRESSURE_REPORT.json` | 5/5 PASS |
| FLOW_PRESSURE_REPORT | `changesets/outbox/wp-20260303-lcs-cid-sid-mid-pipeline/audit/FLOW_PRESSURE_REPORT.json` | 5/5 PASS |

---

## Handoff Checklist

| Item | Status |
|------|--------|
| DB_CHANGESET produced | COMPLETE |
| Migrations applied to Neon | COMPLETE |
| Doctrine library migrated | COMPLETE |
| ctb.table_registry populated (20 entries) | COMPLETE |
| Type B documentation produced | COMPLETE |
| Pressure test reports produced | COMPLETE |
| Worker briefing updated | COMPLETE |
| Changeset updated with all files | COMPLETE |
| Execution log updated with all steps | COMPLETE |
| **Ready for Auditor** | **YES** |
