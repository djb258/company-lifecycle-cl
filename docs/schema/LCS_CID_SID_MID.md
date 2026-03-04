# LCS Pipeline Tables — CID / SID / MID Schema Documentation

> **Source of Truth:** Neon PostgreSQL
> **Verification Mode:** Read-Only
> **Verification Date:** 2026-03-03
> **Sub-Hub:** SH-LCS-PIPELINE
> **Migration:** `migrations/lcs/005_lcs_cid_sid_mid.sql`

---

## 1. Sub-Hub Overview

| Field | Value |
|-------|-------|
| **Sub-Hub ID** | SH-LCS-PIPELINE |
| **Hub** | HUB-CL-001 |
| **Schema** | lcs |
| **CANONICAL** | lcs.cid |
| **ERROR** | lcs.err0 (shared with SH-LCS-EVENTS) |
| **STAGING** | lcs.sid_output, lcs.mid_sequence_state |
| **Doctrine Version** | 3.5.0 |

### Pipeline Data Flow

```
lcs.signal_queue (PENDING)
    │
    ▼
CID Compiler
    │ reads: signal_queue + frame_registry + v_company_intelligence
    │ writes: lcs.cid (COMPILED | FAILED | BLOCKED)
    │ mints: communication_id
    ▼
SID Worker
    │ reads: lcs.cid (COMPILED) + frame_registry + doctrine.doctrine_library
    │ writes: lcs.sid_output (CONSTRUCTED | FAILED | BLOCKED)
    │ resolves: subject, body, sender, recipient
    ▼
MID Engine
    │ reads: lcs.sid_output (CONSTRUCTED) + adapter_registry
    │ writes: lcs.mid_sequence_state (gate → route → deliver)
    │ mints: message_run_id
    │ calls: adapter (MG/HR/SH)
    ▼
CET (lcs.event)
    │ writes: final event record with all IDs
```

### ID Minting Contracts

| ID | Minted By | Format | Uniqueness |
|----|-----------|--------|------------|
| `communication_id` | CID Compiler | `LCS-{PHASE}-{YYYYMMDD}-{ULID}` | PK on lcs.cid, carried by-value through all downstream tables |
| `message_run_id` | MID Engine | `RUN-{COMM_ID}-{CHANNEL}-{ATTEMPT}` | Unique per delivery attempt, references communication_id by value |

All references are **by value**. No foreign keys between pipeline tables.

---

## 2. lcs.cid — CID Compiler Registry

| Field | Value |
|-------|-------|
| **Schema** | lcs |
| **Table** | cid |
| **Classification** | CANONICAL |
| **Mutability** | APPEND-ONLY (INSERT only, UPDATE/DELETE blocked by trigger) |
| **Total Columns** | 14 |

### Column Dictionary

| Column | Type | Nullable | Default | Description | Source of Truth | Volatility | Consumer |
|--------|------|----------|---------|-------------|-----------------|------------|----------|
| `communication_id` | TEXT | NO | — | Minted by CID compiler. Format: `LCS-{PHASE}-{YYYYMMDD}-{ULID}`. Primary key. | CID compiler | IMMUTABLE | SID, MID, CET |
| `sovereign_company_id` | UUID | NO | — | Target company. References cl.company_identity by value. | signal_queue / v_company_intelligence | IMMUTABLE | SID, MID, CET, reporting |
| `entity_type` | TEXT | NO | — | Entity target: `slot` or `person`. | CID compiler | IMMUTABLE | SID |
| `entity_id` | UUID | NO | — | Resolved entity identifier from people sub-hub. | CID compiler | IMMUTABLE | SID |
| `signal_set_hash` | TEXT | NO | — | Source signal reference. References lcs.signal_registry by value. | signal_queue | IMMUTABLE | Audit |
| `signal_queue_id` | UUID | YES | — | Source signal_queue entry. Nullable for manual mints. | signal_queue | IMMUTABLE | Audit |
| `frame_id` | TEXT | NO | — | Bound frame from lcs.frame_registry by value. | CID compiler | IMMUTABLE | SID, MID |
| `lifecycle_phase` | TEXT | NO | — | `OUTREACH`, `SALES`, or `CLIENT`. | CID compiler | IMMUTABLE | SID, MID, CET |
| `lane` | TEXT | NO | — | `MAIN`, `LANE_A`, `LANE_B`, or `NEWSLETTER`. | CID compiler | IMMUTABLE | SID, MID |
| `agent_number` | TEXT | NO | — | Territory agent identifier. | v_company_intelligence | IMMUTABLE | MID, CET |
| `intelligence_tier` | INT | YES | — | Intelligence tier 1-5 snapshot at compilation time. | v_company_intelligence | IMMUTABLE | Reporting |
| `compilation_status` | TEXT | NO | — | `COMPILED`, `FAILED`, or `BLOCKED`. | CID compiler | IMMUTABLE | SID (reads COMPILED only) |
| `compilation_reason` | TEXT | YES | — | Reason string if FAILED or BLOCKED. | CID compiler | IMMUTABLE | Audit, error triage |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Immutable timestamp. | System | IMMUTABLE | Audit |

### Constraints

| Constraint | Type | Definition |
|------------|------|------------|
| PK | PRIMARY KEY | `communication_id` |
| `chk_cid_entity_type` | CHECK | `entity_type IN ('slot', 'person')` |
| `chk_cid_lifecycle_phase` | CHECK | `lifecycle_phase IN ('OUTREACH', 'SALES', 'CLIENT')` |
| `chk_cid_lane` | CHECK | `lane IN ('MAIN', 'LANE_A', 'LANE_B', 'NEWSLETTER')` |
| `chk_cid_compilation_status` | CHECK | `compilation_status IN ('COMPILED', 'FAILED', 'BLOCKED')` |
| `trg_lcs_cid_no_update` | TRIGGER | Blocks UPDATE |
| `trg_lcs_cid_no_delete` | TRIGGER | Blocks DELETE |

### Indexes

| Index | Columns | Type |
|-------|---------|------|
| PK | `communication_id` | btree |
| `idx_lcs_cid_sovereign` | `sovereign_company_id` | btree |
| `idx_lcs_cid_frame` | `frame_id` | btree |
| `idx_lcs_cid_phase_lane` | `lifecycle_phase, lane` | btree |
| `idx_lcs_cid_status` | `compilation_status` | btree |
| `idx_lcs_cid_created` | `created_at` | btree |

---

## 3. lcs.sid_output — SID Message Construction Output

| Field | Value |
|-------|-------|
| **Schema** | lcs |
| **Table** | sid_output |
| **Classification** | STAGING |
| **Mutability** | APPEND-ONLY (INSERT only, UPDATE/DELETE blocked by trigger) |
| **Total Columns** | 14 |

### Column Dictionary

| Column | Type | Nullable | Default | Description | Source of Truth | Volatility | Consumer |
|--------|------|----------|---------|-------------|-----------------|------------|----------|
| `sid_id` | UUID | NO | gen_random_uuid() | Auto-generated primary key. | System | IMMUTABLE | Internal |
| `communication_id` | TEXT | NO | — | References lcs.cid by value. | lcs.cid | IMMUTABLE | MID, CET |
| `frame_id` | TEXT | NO | — | Frame used for message construction. | lcs.cid / frame_registry | IMMUTABLE | MID |
| `template_id` | TEXT | YES | — | Resolved template identifier from doctrine library. | SID worker | IMMUTABLE | Audit |
| `subject_line` | TEXT | YES | — | Constructed email subject line. | SID worker | IMMUTABLE | MID (delivery) |
| `body_plain` | TEXT | YES | — | Constructed plain text body. | SID worker | IMMUTABLE | MID (delivery) |
| `body_html` | TEXT | YES | — | Constructed HTML body. | SID worker | IMMUTABLE | MID (delivery) |
| `sender_identity` | TEXT | YES | — | Sender persona. | SID worker | IMMUTABLE | MID (delivery) |
| `sender_email` | TEXT | YES | — | Resolved from-address. | SID worker | IMMUTABLE | MID (delivery) |
| `recipient_email` | TEXT | YES | — | Resolved to-address. | SID worker | IMMUTABLE | MID (delivery) |
| `recipient_name` | TEXT | YES | — | Resolved recipient display name. | SID worker | IMMUTABLE | MID (delivery) |
| `construction_status` | TEXT | NO | — | `CONSTRUCTED`, `FAILED`, or `BLOCKED`. | SID worker | IMMUTABLE | MID (reads CONSTRUCTED only) |
| `construction_reason` | TEXT | YES | — | Reason string if FAILED or BLOCKED. | SID worker | IMMUTABLE | Audit, error triage |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Immutable timestamp. | System | IMMUTABLE | Audit |

### Constraints

| Constraint | Type | Definition |
|------------|------|------------|
| PK | PRIMARY KEY | `sid_id` |
| `uq_sid_communication` | UNIQUE | `communication_id` |
| `chk_sid_construction_status` | CHECK | `construction_status IN ('CONSTRUCTED', 'FAILED', 'BLOCKED')` |
| `trg_lcs_sid_output_no_update` | TRIGGER | Blocks UPDATE |
| `trg_lcs_sid_output_no_delete` | TRIGGER | Blocks DELETE |

### Indexes

| Index | Columns | Type |
|-------|---------|------|
| PK | `sid_id` | btree |
| `idx_lcs_sid_communication` | `communication_id` | btree (UNIQUE) |
| `idx_lcs_sid_frame` | `frame_id` | btree |
| `idx_lcs_sid_status` | `construction_status` | btree |
| `idx_lcs_sid_created` | `created_at` | btree |

---

## 4. lcs.mid_sequence_state — MID Delivery Sequence State

| Field | Value |
|-------|-------|
| **Schema** | lcs |
| **Table** | mid_sequence_state |
| **Classification** | STAGING |
| **Mutability** | APPEND-ONLY (INSERT only, UPDATE/DELETE blocked by trigger) |
| **Total Columns** | 14 |

### Column Dictionary

| Column | Type | Nullable | Default | Description | Source of Truth | Volatility | Consumer |
|--------|------|----------|---------|-------------|-----------------|------------|----------|
| `mid_id` | UUID | NO | gen_random_uuid() | Auto-generated primary key. | System | IMMUTABLE | Internal |
| `message_run_id` | TEXT | NO | — | Minted by MID engine. Format: `RUN-LCS-{PHASE}-{YYYYMMDD}-{ULID}-{CHANNEL}-{ATTEMPT}`. | MID engine | IMMUTABLE | CET |
| `communication_id` | TEXT | NO | — | References lcs.cid by value. | lcs.sid_output | IMMUTABLE | CET, reporting |
| `adapter_type` | TEXT | NO | — | Routed adapter. References lcs.adapter_registry by value. | MID engine | IMMUTABLE | CET |
| `channel` | TEXT | NO | — | Delivery channel: `MG` (Mailgun), `HR` (HeyReach), `SH` (Sales Handoff). | MID engine | IMMUTABLE | CET |
| `sequence_position` | INT | NO | — | Position in delivery sequence. | MID engine | IMMUTABLE | Audit |
| `attempt_number` | INT | NO | 1 | Delivery attempt number (1-10). | MID engine | IMMUTABLE | Audit |
| `gate_verdict` | TEXT | NO | — | Pre-delivery gate: `PASS`, `FAIL`, or `SKIP`. | MID engine | IMMUTABLE | Audit |
| `gate_reason` | TEXT | YES | — | Reason for FAIL or SKIP gate verdict. | MID engine | IMMUTABLE | Audit, error triage |
| `throttle_status` | TEXT | YES | — | `CLEAR`, `THROTTLED_RECIPIENT`, `THROTTLED_COMPANY`, `THROTTLED_ADAPTER`. | MID engine | IMMUTABLE | Audit |
| `delivery_status` | TEXT | NO | — | `PENDING`, `QUEUED`, `SENT`, `DELIVERED`, `FAILED`, `BOUNCED`. | MID engine | IMMUTABLE | CET, reporting |
| `scheduled_at` | TIMESTAMPTZ | YES | — | When delivery is scheduled. Nullable for immediate sends. | MID engine | IMMUTABLE | MID scheduler |
| `attempted_at` | TIMESTAMPTZ | YES | — | When delivery was attempted. | MID engine | IMMUTABLE | Audit |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Immutable timestamp. | System | IMMUTABLE | Audit |

### Constraints

| Constraint | Type | Definition |
|------------|------|------------|
| PK | PRIMARY KEY | `mid_id` |
| `chk_mid_channel` | CHECK | `channel IN ('MG', 'HR', 'SH')` |
| `chk_mid_gate_verdict` | CHECK | `gate_verdict IN ('PASS', 'FAIL', 'SKIP')` |
| `chk_mid_delivery_status` | CHECK | `delivery_status IN ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED')` |
| `chk_mid_attempt` | CHECK | `attempt_number BETWEEN 1 AND 10` |
| `trg_lcs_mid_sequence_state_no_update` | TRIGGER | Blocks UPDATE |
| `trg_lcs_mid_sequence_state_no_delete` | TRIGGER | Blocks DELETE |

### Indexes

| Index | Columns | Type |
|-------|---------|------|
| PK | `mid_id` | btree |
| `idx_lcs_mid_run` | `message_run_id` | btree |
| `idx_lcs_mid_communication` | `communication_id` | btree |
| `idx_lcs_mid_channel` | `channel` | btree |
| `idx_lcs_mid_delivery_status` | `delivery_status` | btree |
| `idx_lcs_mid_created` | `created_at` | btree |

---

## 5. lcs.frame_registry — Pipeline Columns (ALTER)

5 new nullable columns added to the existing frame_registry by migration 005.

| Column | Type | Nullable | Default | Description | Source of Truth | Volatility | Consumer |
|--------|------|----------|---------|-------------|-----------------|------------|----------|
| `cid_compilation_rule` | TEXT | YES | — | `STANDARD`, `STRICT`, or `LITE`. Controls CID compiler behavior. | Configuration | CONFIG | CID compiler |
| `sid_template_id` | TEXT | YES | — | Template catalog reference for SID construction. | Configuration | CONFIG | SID worker |
| `mid_sequence_type` | TEXT | YES | — | `IMMEDIATE`, `DELAYED`, or `BATCH`. Controls MID delivery timing. | Configuration | CONFIG | MID engine |
| `mid_delay_hours` | INT | YES | — | Delay hours between sequence steps (0-720). Used when DELAYED. | Configuration | CONFIG | MID engine |
| `mid_max_attempts` | INT | YES | 3 | Max delivery attempts per channel (1-10). | Configuration | CONFIG | MID engine |

### Constraints Added

| Constraint | Type | Definition |
|------------|------|------------|
| `chk_frame_cid_rule` | CHECK | `cid_compilation_rule IN ('STANDARD', 'STRICT', 'LITE')` |
| `chk_frame_mid_seq_type` | CHECK | `mid_sequence_type IN ('IMMEDIATE', 'DELAYED', 'BATCH')` |
| `chk_frame_mid_delay` | CHECK | `mid_delay_hours BETWEEN 0 AND 720` |
| `chk_frame_mid_attempts` | CHECK | `mid_max_attempts BETWEEN 1 AND 10` |

---

## 6. Immutability Enforcement

All three pipeline tables are protected by BEFORE UPDATE and BEFORE DELETE triggers:

| Trigger | Table | Action |
|---------|-------|--------|
| `trg_lcs_cid_no_update` | lcs.cid | RAISE EXCEPTION on UPDATE |
| `trg_lcs_cid_no_delete` | lcs.cid | RAISE EXCEPTION on DELETE |
| `trg_lcs_sid_output_no_update` | lcs.sid_output | RAISE EXCEPTION on UPDATE |
| `trg_lcs_sid_output_no_delete` | lcs.sid_output | RAISE EXCEPTION on DELETE |
| `trg_lcs_mid_sequence_state_no_update` | lcs.mid_sequence_state | RAISE EXCEPTION on UPDATE |
| `trg_lcs_mid_sequence_state_no_delete` | lcs.mid_sequence_state | RAISE EXCEPTION on DELETE |

Each new attempt = new row with incremented `attempt_number`. No row is ever mutated.

---

## 7. DOCTRINE: Inbound Sources

### Authorized Write Processes

| Process | Target Table | Authority |
|---------|-------------|-----------|
| CID Compiler (`cid-compiler.ts`) | lcs.cid | Mints communication_id, binds signal + frame + company |
| SID Worker (`sid-worker.ts`) | lcs.sid_output | Constructs message content from CID + frame + doctrine |
| MID Engine (`mid-engine.ts`) | lcs.mid_sequence_state | Sequences delivery, runs gates, calls adapters |

### Explicitly Excluded

| Source | Reason |
|--------|--------|
| Direct SQL inserts | No audit trail, bypasses compilation |
| Manual ad-hoc writes | Pipeline integrity requires deterministic compilation |
| Any process not listed above | Unauthorized — append-only enforcement via trigger |

---

## 8. DOCTRINE: Outbound Usage

### Authorized Read Consumers

| Consumer | Source Table | Purpose | Mutation Authority |
|----------|-------------|---------|-------------------|
| SID Worker | lcs.cid (WHERE compilation_status = 'COMPILED') | Input for message construction | NONE |
| MID Engine | lcs.sid_output (WHERE construction_status = 'CONSTRUCTED') | Input for delivery sequencing | NONE |
| CET Writer | lcs.mid_sequence_state | Final event record assembly | NONE (writes to lcs.event) |
| Matviews | lcs.event | Aggregation | NONE |
| Reporting/BI | All pipeline tables | Analytics | NONE |

---

## 9. Rollback

Migration: `migrations/lcs/005_lcs_cid_sid_mid_rollback.sql`

Drops in reverse order: constraints, columns (frame_registry), triggers, functions, tables (CASCADE).

Verification:
```sql
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'lcs' AND table_name IN ('cid', 'sid_output', 'mid_sequence_state');
-- Expected: 0

SELECT count(*) FROM information_schema.columns
WHERE table_schema = 'lcs' AND table_name = 'frame_registry'
AND column_name IN ('cid_compilation_rule', 'sid_template_id', 'mid_sequence_type', 'mid_delay_hours', 'mid_max_attempts');
-- Expected: 0
```

---

## Document Control

| Field | Value |
|-------|-------|
| Hub | HUB-CL-001 |
| Sub-Hub | SH-LCS-PIPELINE |
| Version | 1.0.0 |
| Status | ACTIVE |
| Created | 2026-03-03 |
| Migration | 005_lcs_cid_sid_mid.sql |
| Work Packet | wp-20260303-lcs-cid-sid-mid-pipeline |
| DB Changeset | db-cs-20260303-001 |
