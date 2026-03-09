# CL + LCS Schema Reference

> Source of truth: Neon PostgreSQL at `ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech`
> Database: Marketing DB
> Last verified: 2026-03-03

---

## cl Schema — Identity Tables

### cl.company_candidate (Staging)

Ingestion staging area. All new companies land here before verification and minting.

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| `candidate_id` | uuid | PK | Auto-generated |
| `company_unique_id` | uuid | FK | Set after minting |
| `source_system` | text | UQ(1) | Origin (clay_import, manual, etc.) |
| `source_record_id` | text | UQ(1) | ID in source |
| `source_payload` | jsonb | | Raw source data |
| `candidate_name` | text | | Company name |
| `candidate_domain` | text | | Domain |
| `candidate_linkedin_url` | text | | LinkedIn URL |
| `candidate_state` | text | | State of incorporation |
| `status` | text | | pending / verified / failed / minted |
| `validation_result` | jsonb | | Validation details |
| `validation_score` | integer | | 0-100 |
| `processing_attempts` | integer | | Retry count (default 0) |
| `error_details` | text | | Error message if failed |
| `created_at` | timestamptz | | Ingestion time |
| `updated_at` | timestamptz | | Last update |
| `processed_at` | timestamptz | | Processing completion |

---

### cl.company_identity (Core — 106,065 rows)

Sovereign identity registry. 33 columns. Doctrine-locked.

**Core identity:**
| Column | Type | Key | Description |
|--------|------|-----|-------------|
| `company_unique_id` | uuid | PK | Sovereign ID (immutable) |
| `company_name` | text | | Company name |
| `company_domain` | text | IDX | Website domain |
| `linkedin_company_url` | text | IDX | LinkedIn URL |
| `source_system` | text | | Origin (immutable) |
| `company_fingerprint` | text | UQ | Composite dedup key |
| `state_code` | char(2) | IDX | US state code (`^[A-Z]{2}$`) |

**Verification:**
| Column | Type | Description |
|--------|------|-------------|
| `existence_verified` | boolean | Existence check result |
| `verification_run_id` | text | Run ID |
| `verified_at` | timestamptz | Verification time |
| `domain_status_code` | integer | HTTP status |
| `name_match_score` | integer | 0-100 |
| `state_match_result` | text | State match |
| `canonical_name` | text | Normalized name |

**Identity pass:**
| Column | Type | Description |
|--------|------|-------------|
| `identity_pass` | integer | Pass count (default 0) |
| `identity_status` | text | PENDING / PASS / FAIL |
| `eligibility_status` | text | ELIGIBLE or exclusion |
| `final_outcome` | text | PASS / FAIL |

**Entity hierarchy:**
| Column | Type | Description |
|--------|------|-------------|
| `entity_role` | text | PARENT_ANCHOR / CHILD_OPERATING_UNIT |
| `sovereign_company_id` | uuid | Parent reference |
| `employee_count_band` | text | Size range |

**Write-once lifecycle pointers (trigger-enforced):**
| Column | Type | Description |
|--------|------|-------------|
| `outreach_id` | uuid | Pointer to Outreach hub |
| `sales_process_id` | uuid | Pointer to Sales hub |
| `client_id` | uuid | Pointer to Client hub |
| `outreach_attached_at` | timestamptz | Auto-set on first write |
| `sales_opened_at` | timestamptz | Auto-set on first write |
| `client_promoted_at` | timestamptz | Auto-set on first write |

**Check constraints:** `cl_identity_admission_gate` (domain OR LinkedIn required), `cl_identity_status_check`, `identity_valid_state_code`.

---

### cl.company_names (Core — 13 cols)

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| `name_id` | uuid | PK | Auto-generated |
| `company_unique_id` | uuid | FK | Parent identity |
| `name_value` | text | | The name |
| `name_type` | text | | legal / trade / dba / brand |
| `is_primary` | boolean | | Primary name flag |
| `language` | text | | ISO lang (default 'en') |
| `verified` | boolean | | Verified? |
| `verification_source` | text | | Verification source |
| `metadata` | jsonb | | Additional data |

---

### cl.company_domains (Core — 24 cols)

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| `domain_id` | uuid | PK | Auto-generated |
| `company_unique_id` | uuid | FK | Parent identity |
| `domain` | text | | The domain |
| `domain_type` | text | | primary / secondary / redirect |
| `is_primary` | boolean | | Primary domain flag |
| `verified` | boolean | | Domain verified? |
| `verification_method` | text | | DNS / HTTP / etc. |

Plus DNS, SSL, WHOIS, and verification metadata columns.

---

### cl.identity_confidence (Core — 18 cols, 1:1 with company_identity)

| Column | Type | Description |
|--------|------|-------------|
| `company_unique_id` | uuid | PK + FK |
| `name_confidence_score` | integer | 0-100 |
| `domain_confidence_score` | integer | 0-100 |
| `linkedin_confidence_score` | integer | 0-100 |
| `state_confidence_score` | integer | 0-100 |
| `overall_confidence_score` | integer | Weighted aggregate |
| `confidence_level` | text | HIGH (80+) / MEDIUM (50-79) / LOW (0-49) |
| `name_verification_status` | text | verified / pending / failed |
| `domain_verification_status` | text | verified / pending / failed |
| `linkedin_verification_status` | text | verified / pending / failed |
| `state_verification_status` | text | verified / pending / failed |

Plus evidence JSONB columns.

---

### cl.company_identity_bridge (Core — 12 cols)

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| `bridge_id` | uuid | PK | Auto-generated |
| `company_sov_id` | uuid | UQ | External sovereign ID |
| `source_company_id` | uuid | UQ | Company ID in source system |
| `source_system` | text | | Source (outreach, sales_process, client, clay_import) |
| `match_confidence_score` | integer | | 0-100 |
| `match_method` | text | | domain_exact, linkedin_exact, fingerprint, manual |
| `match_evidence` | jsonb | | Evidence payload |
| `bridge_status` | text | | active / inactive / deprecated |

---

### cl.domain_hierarchy

Parent-child domain relationships for entity hierarchy resolution.

---

## cl Schema — Error & Audit Tables

### cl.cl_errors

| Column | Type | Description |
|--------|------|-------------|
| `error_id` | uuid | PK |
| `company_unique_id` | uuid | Related company |
| `lifecycle_run_id` | text | Processing run |
| `pass_name` | text | ADMISSION_GATE / EXISTENCE_CHECK / IDENTITY_PASS / ELIGIBILITY_CHECK |
| `failure_reason_code` | text | DOMAIN_UNREACHABLE / NAME_MISMATCH / STATE_MISMATCH / etc. |
| `inputs_snapshot` | jsonb | Data at error time |
| `retry_count` | integer | Current retries (default 0) |
| `retry_ceiling` | integer | Max retries (default 3) |
| `resolved_at` | timestamptz | When resolved |

Unique: `(company_unique_id, pass_name, failure_reason_code)`

### cl.cl_err_existence

Existence verification failures with domain_status_code, redirect_chain, name_match_score, state_match_result.

### cl.identity_gate_audit

Gate check audit trail: gate_run_id, gate_result (PASS/FAIL), gate_checks_performed (jsonb).

### cl.identity_gate_failures

Individual failures: failure_type, failure_details (jsonb).

---

## cl Schema — Views

| View | Source Tables | Key Filter |
|------|-------------|------------|
| `v_company_identity_eligible` | identity + names + domains + confidence | `is_eligible = true` |
| `v_company_lifecycle_status` | identity + names + domains + confidence | Denormalized status |
| `v_company_promotable` | Same as eligible | `can_promote = true` (confidence >= 70) |
| `v_identity_gate_summary` | gate_audit + gate_failures | Aggregated per company |

---

## lcs Schema — Lifecycle Communication Spine

### lcs.signal_queue

Pending signals for CID compilation. PENDING status signals are picked up by the CID compiler.

### lcs.signal_registry

Signal type definitions. Referenced by-value from signal_queue.

### lcs.frame_registry

Communication frame definitions. Includes CID/SID/MID config columns:
- `cid_compilation_rule`: STANDARD / STRICT / LITE
- `sid_template_id`: Template catalog reference
- `mid_sequence_type`: IMMEDIATE / DELAYED / BATCH
- `mid_delay_hours`: 0-720
- `mid_max_attempts`: 1-10 (default 3)

### lcs.adapter_registry

Delivery adapters: MG (Mailgun), HR (HeyReach), SH (Sales Handoff).

### lcs.cid (CANONICAL — Append-Only)

CID compiler output. PK: `communication_id` (format: `LCS-{PHASE}-{YYYYMMDD}-{ULID}`).

| Column | Type | Description |
|--------|------|-------------|
| `communication_id` | text | PK, minted by compiler |
| `sovereign_company_id` | uuid | Target company |
| `entity_type` | text | slot / person |
| `entity_id` | uuid | Resolved entity |
| `signal_set_hash` | text | Source signal ref |
| `frame_id` | text | Bound frame |
| `lifecycle_phase` | text | OUTREACH / SALES / CLIENT |
| `lane` | text | MAIN / LANE_A / LANE_B / NEWSLETTER |
| `compilation_status` | text | COMPILED / FAILED / BLOCKED |

UPDATE/DELETE blocked by trigger.

### lcs.sid_output (STAGING — Append-Only)

SID message construction. Unique on `communication_id`.

| Column | Type | Description |
|--------|------|-------------|
| `sid_id` | uuid | PK |
| `communication_id` | text | References cid by value |
| `subject_line` | text | Constructed subject |
| `body_plain` / `body_html` | text | Message body |
| `sender_email` | text | From address |
| `recipient_email` | text | To address |
| `construction_status` | text | CONSTRUCTED / FAILED / BLOCKED |

UPDATE/DELETE blocked by trigger.

### lcs.mid_sequence_state (STAGING — Append-Only)

MID delivery sequencing. New row per attempt (never mutated).

| Column | Type | Description |
|--------|------|-------------|
| `mid_id` | uuid | PK |
| `message_run_id` | text | Minted by MID engine |
| `communication_id` | text | References cid by value |
| `channel` | text | MG / HR / SH |
| `gate_verdict` | text | PASS / FAIL / SKIP |
| `delivery_status` | text | PENDING / QUEUED / SENT / DELIVERED / FAILED / BOUNCED |
| `attempt_number` | integer | 1-10 |

UPDATE/DELETE blocked by trigger.

### lcs.event (CANONICAL)

Final event records with all IDs from the pipeline.

### lcs.err0 (ERROR)

LCS error table shared across sub-hubs.

### LCS Materialized Views

| View | Purpose |
|------|---------|
| `lcs.v_latest_by_company` | Latest events per company |
| `lcs.v_latest_by_entity` | Latest events per entity |
| `lcs.v_company_intelligence` | Company intelligence aggregation |

---

## ctb Schema

| Table | Purpose |
|-------|---------|
| `ctb.table_registry` | Registry-first enforcement |

## doctrine Schema

| Table | Purpose |
|-------|---------|
| `doctrine.doctrine_library` | Vectorized doctrine content (668 chunks) |
| `doctrine.doctrine_key` | Doctrine key index |
| `doctrine.doctrine_library_error` | Ingestion errors |

---

## Schema Statistics

- **5 tables** in cl schema (core) + error/audit tables
- **12 tables** in lcs schema + 3 materialized views
- **1 table** in ctb schema
- **3 tables** in doctrine schema
- **350+ columns** total
- **60+ constraints**
- **0 foreign keys** (all by-value references, per doctrine)
- **106,000+ cl identity records**
- **668 doctrine chunks**
