# Schema Diff — 005_lcs_cid_sid_mid

**Work Packet**: wp-20260303-lcs-cid-sid-mid-db-changeset
**Generated**: 2026-03-03

---

## NEW TABLE: lcs.cid

**Before**: Does not exist
**After**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| communication_id | TEXT | NOT NULL | — | PK, format check |
| sovereign_company_id | UUID | NOT NULL | — | — |
| entity_type | TEXT | NOT NULL | — | IN ('slot', 'person') |
| entity_id | UUID | NOT NULL | — | — |
| signal_set_hash | TEXT | NOT NULL | — | — |
| signal_queue_id | UUID | NULL | — | — |
| frame_id | TEXT | NOT NULL | — | — |
| lifecycle_phase | TEXT | NOT NULL | — | IN ('OUTREACH', 'SALES', 'CLIENT') |
| lane | TEXT | NOT NULL | — | IN ('MAIN', 'LANE_A', 'LANE_B', 'NEWSLETTER') |
| agent_number | TEXT | NOT NULL | — | — |
| intelligence_tier | INT | NULL | — | BETWEEN 1 AND 5 |
| compilation_status | TEXT | NOT NULL | — | IN ('COMPILED', 'FAILED', 'BLOCKED') |
| compilation_reason | TEXT | NULL | — | — |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Indexes**: company, phase, created, status, signal, frame, compiled (partial)
**Triggers**: UPDATE blocked, DELETE blocked (append-only)

---

## NEW TABLE: lcs.sid_output

**Before**: Does not exist
**After**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| sid_id | UUID | NOT NULL | gen_random_uuid() | PK |
| communication_id | TEXT | NOT NULL | — | format check |
| frame_id | TEXT | NOT NULL | — | — |
| template_id | TEXT | NULL | — | — |
| subject_line | TEXT | NULL | — | — |
| body_plain | TEXT | NULL | — | — |
| body_html | TEXT | NULL | — | — |
| sender_identity | TEXT | NULL | — | — |
| sender_email | TEXT | NULL | — | — |
| recipient_email | TEXT | NULL | — | — |
| recipient_name | TEXT | NULL | — | — |
| construction_status | TEXT | NOT NULL | — | IN ('CONSTRUCTED', 'FAILED', 'BLOCKED') |
| construction_reason | TEXT | NULL | — | — |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Indexes**: comm_id, created, status, constructed (partial)
**Triggers**: UPDATE blocked, DELETE blocked (append-only)

---

## NEW TABLE: lcs.mid_sequence_state

**Before**: Does not exist
**After**:

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| mid_id | UUID | NOT NULL | gen_random_uuid() | PK |
| message_run_id | TEXT | NOT NULL | — | format check |
| communication_id | TEXT | NOT NULL | — | format check |
| adapter_type | TEXT | NOT NULL | — | — |
| channel | TEXT | NOT NULL | — | IN ('MG', 'HR', 'SH') |
| sequence_position | INT | NOT NULL | — | — |
| attempt_number | INT | NOT NULL | 1 | BETWEEN 1 AND 10 |
| gate_verdict | TEXT | NOT NULL | — | IN ('PASS', 'FAIL', 'SKIP') |
| gate_reason | TEXT | NULL | — | — |
| throttle_status | TEXT | NULL | — | IN ('CLEAR', 'THROTTLED_*') |
| delivery_status | TEXT | NOT NULL | 'PENDING' | IN ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED') |
| scheduled_at | TIMESTAMPTZ | NULL | — | — |
| attempted_at | TIMESTAMPTZ | NULL | — | — |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Indexes**: comm_id, run_id, created, delivery, pending (partial), adapter+channel
**Triggers**: UPDATE blocked, DELETE blocked (append-only)

---

## ALTER TABLE: lcs.frame_registry

**Before**: 13 columns (frame_id through updated_at)
**After**: 18 columns (+5 new)

| New Column | Type | Nullable | Default | Constraints |
|------------|------|----------|---------|-------------|
| cid_compilation_rule | TEXT | NULL | — | IN ('STANDARD', 'STRICT', 'LITE') |
| sid_template_id | TEXT | NULL | — | — |
| mid_sequence_type | TEXT | NULL | — | IN ('IMMEDIATE', 'DELAYED', 'BATCH') |
| mid_delay_hours | INT | NULL | — | BETWEEN 0 AND 720 |
| mid_max_attempts | INT | NULL | 3 | BETWEEN 1 AND 10 |

**Existing columns**: Unchanged
**Existing data**: Unaffected (all new columns nullable)
