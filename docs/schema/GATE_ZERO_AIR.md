# cl.gate_zero_air — Schema Documentation

**Schema:** `cl`
**Table:** `gate_zero_air`
**Status:** Doctrine-Locked
**Last Documented:** 2025-12-31

---

## 1. Table Description

The `cl.gate_zero_air` table is the **immutable event log** for Gate Zero processing.

AIR = **Action / Incident / Result**

AIR records are deterministic process telemetry emitted whenever Gate Zero produces a meaningful outcome. This is not logging, not metrics, not debugging — it is the **contract** by which downstream systems (like the Sovereign Mint Worker) subscribe to Gate Zero outcomes.

**This table represents:**
- Every attempt to verify a company candidate
- Every pass, fail, and exhausted outcome
- The exact reason code for each outcome
- The timestamp and actor for each event

**This table does NOT represent:**
- The intake data itself (that's `gate_zero_intake`)
- Recovery state (that's `gate_zero_recovery`)
- Enrichment or augmented data
- Sovereign company identity

**Doctrine:**

> AIR records are immutable, structured event records emitted whenever a lifecycle action produces a meaningful outcome (success, failure, deferral, or authorization).

---

## 2. Column Descriptions

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `air_event_id` | UUID | NO | Unique identifier for this AIR event. Auto-generated. Primary key. |
| `entity_type` | TEXT | NO | Type of entity: `intake` (Gate Zero operates on intake only). |
| `entity_id` | UUID | NO | The `intake_id` this event relates to. |
| `stage_id` | TEXT | NO | Stage identifier: `GATE_ZERO`. Fixed for this table. |
| `process_id` | TEXT | NO | Process identifier: `VERIFY_COMPANY_EXISTENCE`. |
| `event_type` | TEXT | NO | Event outcome type: `ATTEMPT`, `PASS`, `FAIL`, `AUTH`, `EXHAUSTED`, `REENTER`. |
| `reason_code` | TEXT | NO | Specific reason code for this event. |
| `batch_id` | TEXT | YES | Optional batch identifier. Inherited from intake. |
| `payload_ref` | TEXT | YES | Optional pointer to additional payload data. |
| `actor` | TEXT | YES | Who/what triggered this event: `system`, `ai`, `human`. |
| `event_timestamp` | TIMESTAMPTZ | NO | When this event occurred. Auto-set. |

---

## 3. Column Semantics

### Primary Identifier
| Column | Role |
|--------|------|
| `air_event_id` | **AIR primary key.** Unique per event. |

### Entity Reference
| Column | Role |
|--------|------|
| `entity_type` | Always `intake` for Gate Zero. |
| `entity_id` | The `intake_id` being processed. |

### Stage & Process Identification
| Column | Role |
|--------|------|
| `stage_id` | WHERE — identifies Gate Zero as the emitting stage. |
| `process_id` | WHAT — identifies the specific action taken. |

### Event Outcome
| Column | Role |
|--------|------|
| `event_type` | The outcome category (ATTEMPT, PASS, FAIL, AUTH, etc.). |
| `reason_code` | Specific reason within that category. |

### Optional Context
| Column | Role |
|--------|------|
| `batch_id` | Groups events by import batch. |
| `payload_ref` | Reference to external payload if needed. |
| `actor` | Attribution for the event. |

### Temporal
| Column | Role |
|--------|------|
| `event_timestamp` | Immutable timestamp of event occurrence. |

---

## 4. Event Types

| Event Type | Description | When Emitted |
|------------|-------------|--------------|
| `ATTEMPT` | Processing has begun | Start of verification |
| `PASS` | Verification passed (internal) | After successful checks (immediately before AUTH) |
| `FAIL` | Verification failed | After any check failure |
| `AUTH` | Authorization granted | After PASS; signals downstream mint eligibility |
| `EXHAUSTED` | Max retries reached | After 3rd failed attempt |
| `REENTER` | Successful recovery | After recovery success; new intake created |

**Note:** `AUTH` is the critical event. It signals to the Sovereign Mint Worker that this intake is ready for sovereign identity minting.

---

## 5. Reason Codes

### ATTEMPT Reason Codes
| Reason Code | Description |
|-------------|-------------|
| `START` | Initial processing attempt |
| `RETRY` | Retry attempt from recovery |

### PASS Reason Codes
| Reason Code | Description |
|-------------|-------------|
| `CHECKS_PASSED` | All verification checks passed |

### FAIL Reason Codes
| Reason Code | Description |
|-------------|-------------|
| `DOMAIN_NOT_FOUND` | Domain DNS lookup failed |
| `DOMAIN_NO_IMPRINT` | Domain resolves but no company presence |
| `NO_LINKEDIN_COMPANY` | LinkedIn company page not found |
| `STATE_MISMATCH` | LinkedIn state differs from intake state |
| `STATE_AMBIGUOUS` | LinkedIn lists multiple states or global |
| `STATE_MISSING` | LinkedIn has no location information |
| `API_UNAVAILABLE` | External API temporarily unavailable |
| `TIMEOUT` | Verification request timed out |

### AUTH Reason Codes
| Reason Code | Description |
|-------------|-------------|
| `EXISTENCE_CONFIRMED` | Company existence verified; ready for minting |

### EXHAUSTED Reason Codes
| Reason Code | Description |
|-------------|-------------|
| `MAX_ATTEMPTS_REACHED` | 3 attempts exhausted without success |

### REENTER Reason Codes
| Reason Code | Description |
|-------------|-------------|
| `RECOVERY_SUCCESS` | Recovery attempt succeeded; new intake created |

---

## 6. Immutability & Invariants

### All Columns Are IMMUTABLE

| Column | Immutability |
|--------|--------------|
| `air_event_id` | **IMMUTABLE.** Once created, permanent. |
| `entity_type` | **IMMUTABLE.** |
| `entity_id` | **IMMUTABLE.** |
| `stage_id` | **IMMUTABLE.** |
| `process_id` | **IMMUTABLE.** |
| `event_type` | **IMMUTABLE.** |
| `reason_code` | **IMMUTABLE.** |
| `batch_id` | **IMMUTABLE.** |
| `payload_ref` | **IMMUTABLE.** |
| `actor` | **IMMUTABLE.** |
| `event_timestamp` | **IMMUTABLE.** |

**Doctrine:**

> AIR records can only be INSERTed, never UPDATEd or DELETEd.

### Table-Level Invariants

| Invariant | Description |
|-----------|-------------|
| **Unique Event ID** | No two rows may share the same `air_event_id`. |
| **Append Only** | No UPDATE or DELETE permitted. |
| **Complete** | Every Gate Zero outcome emits an AIR event. |
| **Ordered** | Events for an `entity_id` are chronologically ordered by `event_timestamp`. |
| **Traceable** | Every event includes `stage_id`, `process_id`, and `reason_code`. |

---

## 7. Event Sequence Examples

### Example 1: First-Attempt Pass

```
1. ATTEMPT  | reason_code: START
2. PASS     | reason_code: CHECKS_PASSED
3. AUTH     | reason_code: EXISTENCE_CONFIRMED
```

### Example 2: First-Attempt Fail, Then Recovery Success

```
1. ATTEMPT  | reason_code: START
2. FAIL     | reason_code: STATE_MISMATCH
   [24h backoff]
3. ATTEMPT  | reason_code: RETRY
4. PASS     | reason_code: CHECKS_PASSED
5. AUTH     | reason_code: EXISTENCE_CONFIRMED
6. REENTER  | reason_code: RECOVERY_SUCCESS
```

### Example 3: Three Failures → Exhausted

```
1. ATTEMPT  | reason_code: START
2. FAIL     | reason_code: NO_LINKEDIN_COMPANY
   [24h backoff]
3. ATTEMPT  | reason_code: RETRY
4. FAIL     | reason_code: NO_LINKEDIN_COMPANY
   [72h backoff]
5. ATTEMPT  | reason_code: RETRY
6. FAIL     | reason_code: NO_LINKEDIN_COMPANY
7. EXHAUSTED | reason_code: MAX_ATTEMPTS_REACHED
```

---

## 8. Downstream Subscription

The **Sovereign Mint Worker** subscribes to Gate Zero AIR to identify intake records ready for minting.

### Subscription Query

```sql
SELECT entity_id AS intake_id, event_timestamp
FROM cl.gate_zero_air
WHERE stage_id = 'GATE_ZERO'
  AND event_type = 'AUTH'
  AND reason_code = 'EXISTENCE_CONFIRMED'
  AND event_timestamp > :last_processed_timestamp
ORDER BY event_timestamp ASC
```

### Mint Worker Flow

1. Poll Gate Zero AIR for AUTH events
2. For each AUTH event, read `gate_zero_intake` by `intake_id`
3. Mint `sovereign_company_id` in `company_identity`
4. Emit `MINT` event in Sovereign Mint AIR

**Invariant:**

> Authorization travels by AIR. Data stays where it was created.

---

## 9. AI Usage Notes

### How to Read This Table Correctly

**Purpose:** When you need to understand the verification history for an intake, or when subscribing to Gate Zero outcomes.

**Query pattern for intake history:**
```sql
SELECT event_type, reason_code, event_timestamp
FROM cl.gate_zero_air
WHERE entity_id = :intake_id
ORDER BY event_timestamp ASC
```

**Query pattern for recent failures:**
```sql
SELECT entity_id, reason_code, event_timestamp
FROM cl.gate_zero_air
WHERE event_type = 'FAIL'
  AND event_timestamp > now() - INTERVAL '24 hours'
ORDER BY event_timestamp DESC
```

**Query pattern for authorization subscription:**
```sql
SELECT entity_id, event_timestamp
FROM cl.gate_zero_air
WHERE stage_id = 'GATE_ZERO'
  AND event_type = 'AUTH'
  AND reason_code = 'EXISTENCE_CONFIRMED'
ORDER BY event_timestamp ASC
```

### What This Table Tells You

- Complete verification history for any intake
- Exact reason why an intake passed or failed
- When each event occurred
- Which events are AUTH (ready for minting)

### What This Table Does NOT Tell You

- The intake data itself (join to `gate_zero_intake`)
- Current recovery state (see `gate_zero_recovery`)
- Whether sovereign identity has been minted (see Sovereign Mint AIR)

### Correct Usage Pattern

```
1. Gate Zero emits ATTEMPT at start
2. Gate Zero runs verification
3a. If pass → emit PASS, then AUTH
3b. If fail → emit FAIL
4. Downstream workers subscribe to AIR
5. Mint Worker acts on AUTH events
6. Recovery Worker acts on FAIL events
```

### Anti-Patterns (Do NOT Do These)

| Anti-Pattern | Why Wrong |
|--------------|-----------|
| UPDATE an AIR record | AIR is append-only |
| DELETE an AIR record | AIR is immutable |
| Skip emitting ATTEMPT | Every processing must start with ATTEMPT |
| Emit AUTH without PASS | AUTH follows PASS, never standalone |
| Emit MINT in Gate Zero AIR | MINT is emitted by Sovereign Mint Worker in its own AIR |

---

## 10. SQL Comments (Apply to Database)

```sql
-- Table comment
COMMENT ON TABLE cl.gate_zero_air IS
'Immutable AIR (Action/Incident/Result) event log for Gate Zero. Records every verification attempt, pass, fail, and authorization. Downstream workers subscribe to this table for AUTH events. Append-only; no UPDATE or DELETE permitted.';

-- Column comments
COMMENT ON COLUMN cl.gate_zero_air.air_event_id IS
'Unique identifier for this AIR event. Auto-generated UUID. Immutable.';

COMMENT ON COLUMN cl.gate_zero_air.entity_type IS
'Type of entity: always "intake" for Gate Zero.';

COMMENT ON COLUMN cl.gate_zero_air.entity_id IS
'The intake_id this event relates to.';

COMMENT ON COLUMN cl.gate_zero_air.stage_id IS
'Stage identifier: always "GATE_ZERO" for this table.';

COMMENT ON COLUMN cl.gate_zero_air.process_id IS
'Process identifier: the specific action taken (e.g., VERIFY_COMPANY_EXISTENCE).';

COMMENT ON COLUMN cl.gate_zero_air.event_type IS
'Event outcome: ATTEMPT, PASS, FAIL, AUTH, EXHAUSTED, REENTER.';

COMMENT ON COLUMN cl.gate_zero_air.reason_code IS
'Specific reason code for this event.';

COMMENT ON COLUMN cl.gate_zero_air.batch_id IS
'Optional batch identifier. Inherited from intake.';

COMMENT ON COLUMN cl.gate_zero_air.payload_ref IS
'Optional pointer to additional payload data.';

COMMENT ON COLUMN cl.gate_zero_air.actor IS
'Who/what triggered this event: system, ai, human.';

COMMENT ON COLUMN cl.gate_zero_air.event_timestamp IS
'When this event occurred. Immutable. Always UTC.';
```

---

**Documentation Version:** 1.0
**Table Version:** 001
