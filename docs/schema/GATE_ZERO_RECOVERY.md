# cl.gate_zero_recovery — Schema Documentation

**Schema:** `cl`
**Table:** `gate_zero_recovery`
**Status:** Doctrine-Locked
**Last Documented:** 2025-12-31

---

## 1. Table Description

The `cl.gate_zero_recovery` table holds **failed intake records** awaiting retry processing.

When a company candidate fails Gate Zero verification, a recovery record is created to track retry attempts, enforce throttle rules, and determine when the record should be marked EXHAUSTED.

**This table represents:**
- A failed intake attempt awaiting retry
- Throttle state (attempt count, next eligible timestamp)
- Failure reason from the last attempt
- Recovery status (ACTIVE or EXHAUSTED)

**This table does NOT represent:**
- The original intake data (that's in `gate_zero_intake`)
- Successful verifications (those go to AIR)
- Enrichment or augmented data
- Sovereign company identity

---

## 2. Column Descriptions

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `recovery_id` | UUID | NO | Unique identifier for this recovery record. Auto-generated. |
| `intake_id` | UUID | NO | Reference to the original `gate_zero_intake` record. |
| `batch_id` | TEXT | YES | Inherited from intake. Used for batch-level operations. |
| `failure_reason` | TEXT | NO | Reason code from last failed attempt (e.g., `STATE_MISMATCH`). |
| `attempt_count` | INTEGER | NO | Number of verification attempts. Starts at 1. Max 3. |
| `next_eligible_at` | TIMESTAMPTZ | NO | Earliest timestamp when retry is permitted. Enforced gate. |
| `status` | TEXT | NO | Recovery status: `ACTIVE` or `EXHAUSTED`. |
| `created_at` | TIMESTAMPTZ | NO | Timestamp when recovery record was created. |
| `updated_at` | TIMESTAMPTZ | NO | Timestamp of last update (attempt or status change). |

---

## 3. Column Semantics

### Primary Identifier
| Column | Role |
|--------|------|
| `recovery_id` | **Recovery primary key.** Unique per recovery record. |

### Foreign Reference
| Column | Role |
|--------|------|
| `intake_id` | Reference to original intake. One intake → one recovery record (if failed). |

### Throttle State
| Column | Role |
|--------|------|
| `attempt_count` | Current attempt number. Incremented on each retry. |
| `next_eligible_at` | Enforced gate. No retries before this timestamp. |
| `status` | Terminal status indicator. ACTIVE = retryable, EXHAUSTED = no more retries. |

### Failure Context
| Column | Role |
|--------|------|
| `failure_reason` | Last failure reason code. Updated on each failed attempt. |

### Metadata
| Column | Role |
|--------|------|
| `batch_id` | Inherited from intake. Enables batch-level operations. |
| `created_at` | When recovery record was created. |
| `updated_at` | When record was last modified. |

---

## 4. Status Values

| Status | Description |
|--------|-------------|
| `ACTIVE` | Recovery is active. Record eligible for retry (after `next_eligible_at`). |
| `EXHAUSTED` | Max attempts reached. No further retries. Terminal state. |

---

## 5. Throttle Rules

### Per-Record Limits

| Parameter | Value | Description |
|-----------|-------|-------------|
| `max_attempts` | 3 | Hard stop. No more than 3 total attempts. |
| `attempt_count` | 1-3 | Incremented on each run. |

### Backoff Schedule

| Attempt | Wait Period | `next_eligible_at` |
|---------|-------------|-------------------|
| 1 → 2 | 24 hours | `now() + INTERVAL '24 hours'` |
| 2 → 3 | 72 hours | `now() + INTERVAL '72 hours'` |
| 3 → EXHAUSTED | N/A | Terminal |

**Full schedule:** 24h → 72h → 168h (1 day, 3 days, 7 days from initial failure)

### Batch Envelope

| Parameter | Value | Description |
|-----------|-------|-------------|
| `recovery_window_days` | 14 | After import batch completes, then freeze |
| `batch_freeze_at` | Batch-level | All ACTIVE records in batch → EXHAUSTED |

### Kill Switch

The batch-level kill switch can instantly pause all recovery processing:

```
/cl/gate-zero/kill-switch?batch_id={batch_id}
```

---

## 6. Failure Reason Codes

| Reason Code | Description |
|-------------|-------------|
| `DOMAIN_NOT_FOUND` | Domain DNS lookup failed |
| `DOMAIN_NO_IMPRINT` | Domain resolves but no company presence |
| `NO_LINKEDIN_COMPANY` | LinkedIn company page not found |
| `STATE_MISMATCH` | LinkedIn state differs from intake state |
| `STATE_AMBIGUOUS` | LinkedIn lists multiple states or global |
| `STATE_MISSING` | LinkedIn has no location information |
| `API_UNAVAILABLE` | External API (LinkedIn) temporarily unavailable |
| `TIMEOUT` | Verification request timed out |

---

## 7. Immutability & Invariants

### Immutable Columns (NEVER change after insert)

| Column | Immutability |
|--------|--------------|
| `recovery_id` | **IMMUTABLE.** Once assigned, permanent. |
| `intake_id` | **IMMUTABLE.** Reference to original intake never changes. |
| `batch_id` | **IMMUTABLE.** Inherited from intake. |
| `created_at` | **IMMUTABLE.** Reflects moment of recovery creation. |

### Updatable Columns (Via recovery processing only)

| Column | Mutability |
|--------|------------|
| `failure_reason` | Updated on each failed retry. |
| `attempt_count` | Incremented on each retry. |
| `next_eligible_at` | Updated after each failed retry. |
| `status` | Updated when EXHAUSTED. |
| `updated_at` | Updated on any modification. |

### Table-Level Invariants

| Invariant | Description |
|-----------|-------------|
| **Unique Recovery ID** | No two rows may share the same `recovery_id`. |
| **Unique Intake Reference** | One `intake_id` maps to at most one recovery record. |
| **Attempt Limit** | `attempt_count` cannot exceed 3. |
| **Enforced Backoff** | No retry before `next_eligible_at`. |
| **Terminal EXHAUSTED** | Once EXHAUSTED, status cannot change. |
| **No Deletion** | Recovery records are never deleted. |

---

## 8. State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                    Recovery State Machine                    │
└─────────────────────────────────────────────────────────────┘

    FAIL (from Gate Zero)
           │
           ▼
    ┌─────────────┐
    │   ACTIVE    │  attempt_count = 1
    │             │  next_eligible_at = now + 24h
    └──────┬──────┘
           │
           │ [wait 24h]
           ▼
    ┌─────────────┐
    │   RETRY 1   │ ─── PASS ───▶ AUTH + REENTER (new intake_id)
    └──────┬──────┘               original status = REENTER_SUCCEEDED
           │
           │ FAIL
           ▼
    ┌─────────────┐
    │   ACTIVE    │  attempt_count = 2
    │             │  next_eligible_at = now + 72h
    └──────┬──────┘
           │
           │ [wait 72h]
           ▼
    ┌─────────────┐
    │   RETRY 2   │ ─── PASS ───▶ AUTH + REENTER
    └──────┬──────┘
           │
           │ FAIL
           ▼
    ┌─────────────┐
    │   ACTIVE    │  attempt_count = 3
    │             │  next_eligible_at = now + 168h
    └──────┬──────┘
           │
           │ [wait 168h]
           ▼
    ┌─────────────┐
    │   RETRY 3   │ ─── PASS ───▶ AUTH + REENTER
    └──────┬──────┘
           │
           │ FAIL
           ▼
    ┌─────────────┐
    │  EXHAUSTED  │  Terminal. AIR: EXHAUSTED emitted.
    └─────────────┘
```

---

## 9. Re-entry on Success

When a recovery attempt succeeds:

1. **Emit AUTH** to Gate Zero AIR (with original `intake_id`)
2. **Emit REENTER** event indicating success after recovery
3. **Create new intake record** with new `intake_id` (for clean lineage)
4. **Update original intake** status → `REENTER_SUCCEEDED`
5. **Update recovery record** status → (optional: `SUCCEEDED` or just leave as is)

**Invariant:**

> Failed records are never mutated to AUTHORIZED. Success creates a new intake attempt.

This ensures:
- Clean audit trail
- No ambiguity about original failure
- New sovereign identity links to new intake_id

---

## 10. AI Usage Notes

### How to Read This Table Correctly

**Purpose:** When you need to find records eligible for retry or check recovery status.

**Query pattern for eligible retries:**
```sql
SELECT r.recovery_id, r.intake_id, r.attempt_count, i.company_name
FROM cl.gate_zero_recovery r
JOIN cl.gate_zero_intake i ON r.intake_id = i.intake_id
WHERE r.status = 'ACTIVE'
  AND r.next_eligible_at <= now()
ORDER BY r.next_eligible_at ASC
```

**Query pattern for exhausted records:**
```sql
SELECT r.intake_id, r.failure_reason, r.attempt_count
FROM cl.gate_zero_recovery r
WHERE r.status = 'EXHAUSTED'
  AND r.batch_id = '2025_annual_outreach'
```

### What This Table Tells You

- Which failed intakes are awaiting retry
- Current attempt count and backoff state
- Why the last attempt failed
- Whether record is ACTIVE or EXHAUSTED

### What This Table Does NOT Tell You

- The original intake data (join to `gate_zero_intake`)
- Historical failure reasons (only last reason; see AIR for full history)
- Verification details (see AIR for attempt-by-attempt records)

### Correct Usage Pattern

```
1. Gate Zero FAIL on intake
2. Create recovery record: status=ACTIVE, attempt_count=1, next_eligible_at=now+24h
3. Emit FAIL to AIR
4. [Wait for backoff]
5. Query eligible retries
6. Re-run Gate Zero verification
7a. If PASS → AUTH + REENTER, create new intake, update original
7b. If FAIL → increment attempt_count, update next_eligible_at, update failure_reason
8. After attempt 3 FAIL → status=EXHAUSTED, emit EXHAUSTED to AIR
```

### Anti-Patterns (Do NOT Do These)

| Anti-Pattern | Why Wrong |
|--------------|-----------|
| Retry before `next_eligible_at` | Violates throttle rules |
| Increment beyond 3 attempts | Hard limit enforced |
| Delete recovery records | Preserved for audit |
| Flip EXHAUSTED to ACTIVE | Terminal state is permanent |
| Update intake to AUTHORIZED on recovery success | Success creates new intake |

---

## 11. SQL Comments (Apply to Database)

```sql
-- Table comment
COMMENT ON TABLE cl.gate_zero_recovery IS
'Failed intake records awaiting retry. Tracks throttle state (attempt_count, next_eligible_at) and failure reason. Terminal states: ACTIVE (retryable) or EXHAUSTED (no more retries).';

-- Column comments
COMMENT ON COLUMN cl.gate_zero_recovery.recovery_id IS
'Unique identifier for this recovery record. Auto-generated UUID.';

COMMENT ON COLUMN cl.gate_zero_recovery.intake_id IS
'Reference to original gate_zero_intake record. One intake → one recovery.';

COMMENT ON COLUMN cl.gate_zero_recovery.batch_id IS
'Inherited from intake. Used for batch-level operations.';

COMMENT ON COLUMN cl.gate_zero_recovery.failure_reason IS
'Reason code from last failed attempt. Updated on each retry.';

COMMENT ON COLUMN cl.gate_zero_recovery.attempt_count IS
'Number of verification attempts. Starts at 1. Max 3.';

COMMENT ON COLUMN cl.gate_zero_recovery.next_eligible_at IS
'Earliest timestamp when retry is permitted. Enforced gate.';

COMMENT ON COLUMN cl.gate_zero_recovery.status IS
'Recovery status: ACTIVE (retryable) or EXHAUSTED (terminal).';

COMMENT ON COLUMN cl.gate_zero_recovery.created_at IS
'Timestamp when recovery record was created.';

COMMENT ON COLUMN cl.gate_zero_recovery.updated_at IS
'Timestamp of last update.';
```

---

**Documentation Version:** 1.0
**Table Version:** 001
