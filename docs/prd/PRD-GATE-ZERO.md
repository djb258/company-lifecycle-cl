# PRD — Gate Zero

## 1. Overview

* **System Name:** Company Lifecycle (CL)
* **Stage Name:** Gate Zero
* **Owner:** Barton / Supreme Headquarters (SHQ)
* **Version:** v1.0

---

## 2. Stage Identity

| Field          | Value                  |
| -------------- | ---------------------- |
| **Hub ID**     | HUB-CL-001             |
| **Stage ID**   | GATE_ZERO              |
| **Process ID** | VERIFY_COMPANY_EXISTENCE |

---

## 3. Purpose

Gate Zero is the **binary existence verification stage** within the Company Lifecycle system.

Gate Zero determines:

* Whether a company candidate has sufficient identity anchors to proceed
* Whether the claimed identity (domain + LinkedIn + state) is coherent
* Whether the company exists as a verifiable entity

Gate Zero does **not**:

* Mint sovereign identities
* Enrich authoritative tables
* Make business decisions
* Infer or guess missing data

**Doctrine statement:**

> Gate Zero validates **identity coherence**, not legal domicile, tax nexus, or operating footprint.

---

## 4. Gate Zero Is NOT

| What It's Not | Why |
|---------------|-----|
| A Hub | Gate Zero is a lifecycle stage within CL, not a separate hub |
| An Outreach concern | Outreach operates on sovereign companies; Gate Zero operates pre-sovereignty |
| An enrichment service | Gate Zero verifies, it does not augment or fill gaps |
| A workflow engine | Binary pass/fail only; no conditional paths |

---

## 5. Diagram

```
[ Source Lists ]
      │
      ▼
┌─────────────────────┐
│   Gate Zero Intake  │
│     (intake_id)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Existence Check   │
│ domain + LinkedIn   │
│      + state        │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
  ┌──────┐   ┌──────┐
  │ FAIL │   │ PASS │
  └──┬───┘   └──┬───┘
     │          │
     ▼          ▼
┌─────────┐  ┌─────────────────┐
│Recovery │  │ AUTH → AIR      │
│ Table   │  │ (Mint Worker    │
│         │  │  subscribes)    │
└─────────┘  └─────────────────┘
```

---

## 6. Identity Model

### 6.1 Gate Zero Uses `intake_id` Only

| Identifier | Used By | Gate Zero Access |
|------------|---------|------------------|
| `intake_id` | Gate Zero | YES — primary key |
| `sovereign_company_id` | Company Identity | NO — never touched |

**Invariant:**

> Gate Zero operates exclusively on `intake_id`. It has no knowledge of, and no access to, `sovereign_company_id`.

### 6.2 Pre-Sovereignty

Gate Zero exists in the **pre-sovereignty zone**. Records at this stage are candidates, not companies.

```
                    SOVEREIGNTY BOUNDARY
                           │
    Gate Zero              │     Company Identity
    (intake_id)            │     (sovereign_company_id)
                           │
    ─────────────────────▶ │ ─────────────────────────▶
        AUTH via AIR       │      MINT via Mint Worker
```

---

## 7. Existence Check Logic

### 7.1 Required Inputs

| Field | Source | Required |
|-------|--------|----------|
| `company_name` | Intake record | YES |
| `company_domain` | Intake record | YES |
| `linkedin_company_url` | Intake record | YES |
| `intake_state` | Intake record (from source list) | YES |

### 7.2 Verification Source

| Data Point | Verification Source |
|------------|---------------------|
| Domain existence | DNS / HTTP probe |
| LinkedIn company | LinkedIn company page |
| State match | LinkedIn company location field |

### 7.3 Pass Condition (Deterministic)

All of the following must be true:

1. Domain resolves to a legitimate company web presence
2. LinkedIn company page exists and is accessible
3. LinkedIn company location explicitly lists a US state
4. LinkedIn state **matches** the intake state

**If all pass → emit `AUTH`**

### 7.4 Fail Conditions

| Condition | Reason Code |
|-----------|-------------|
| Domain does not resolve | `DOMAIN_NOT_FOUND` |
| Domain resolves but no company imprint | `DOMAIN_NO_IMPRINT` |
| LinkedIn company page not found | `NO_LINKEDIN_COMPANY` |
| LinkedIn lists different state | `STATE_MISMATCH` |
| LinkedIn lists multiple states / global | `STATE_AMBIGUOUS` |
| LinkedIn lists no location | `STATE_MISSING` |

**If any fail → emit `FAIL` → route to Recovery**

---

## 8. AIR Integration

### 8.1 AIR = Action / Incident / Result

Gate Zero emits AIR events for every processing attempt.

**Doctrine:**

> AIR records are immutable, structured event records emitted whenever a lifecycle action produces a meaningful outcome (success, failure, deferral, or authorization).

### 8.2 Gate Zero AIR Events

| Event Type | When Emitted | Reason Code |
|------------|--------------|-------------|
| `ATTEMPT` | Processing begins | `START` |
| `FAIL` | Existence check fails | (see fail conditions) |
| `AUTH` | Existence check passes | `EXISTENCE_CONFIRMED` |
| `EXHAUSTED` | Max retries reached | `MAX_ATTEMPTS_REACHED` |

### 8.3 AIR Event Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Gate Zero AIR                        │
├─────────────────────────────────────────────────────────┤
│ entity_type   = 'intake'                                │
│ entity_id     = intake_id                               │
│ stage_id      = 'GATE_ZERO'                             │
│ process_id    = 'VERIFY_COMPANY_EXISTENCE'              │
│ event_type    = ATTEMPT | FAIL | AUTH | EXHAUSTED       │
│ reason_code   = (context-specific)                      │
│ event_timestamp = now()                                 │
└─────────────────────────────────────────────────────────┘
```

### 8.4 Downstream Subscription

The **Sovereign Mint Worker** subscribes to Gate Zero AIR:

```
WHERE stage_id      = 'GATE_ZERO'
  AND event_type    = 'AUTH'
  AND reason_code   = 'EXISTENCE_CONFIRMED'
```

On match, Mint Worker:
1. Reads original intake row by `intake_id`
2. Mints `sovereign_company_id`
3. Emits `MINT` in Sovereign Mint AIR

**Invariant:**

> Authorization travels by AIR. Data stays where it was created.

---

## 9. Recovery Model

### 9.1 Recovery Table

Failed intake records are routed to a recovery table for retry processing.

| Field | Purpose |
|-------|---------|
| `intake_id` | Reference to original intake |
| `failure_reason` | Last fail reason code |
| `attempt_count` | Number of attempts (max 3) |
| `next_eligible_at` | Earliest retry timestamp |
| `status` | `ACTIVE` or `EXHAUSTED` |

### 9.2 Throttle Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `max_attempts` | 3 | Hard stop after 3 attempts |
| `backoff_schedule` | 24h → 72h → 168h | 1 day, 3 days, 7 days |
| `recovery_window_days` | 14 | After import batch, then freeze |
| `next_eligible_at` | Enforced | No early retries permitted |

### 9.3 Recovery Flow

```
FAIL (attempt 1)
    │
    ▼
Recovery Table (next_eligible_at = now + 24h)
    │
    ├─── [24h passes] ───▶ Re-enter Gate Zero
    │                           │
    │                     ┌─────┴─────┐
    │                     │           │
    │                   FAIL        PASS
    │                     │           │
    │                     ▼           ▼
    │              attempt_count++   AUTH + REENTER
    │                     │           (new intake_id)
    │                     ▼
    │              next_eligible_at = now + 72h
    │
    └─── [after attempt 3] ───▶ EXHAUSTED
                                    │
                                    ▼
                              AIR: EXHAUSTED
                              status = EXHAUSTED
```

### 9.4 Re-entry Rule

On recovery success:

1. Emit `AUTH` event
2. Emit `REENTER` event with new `intake_id`
3. Original failed row status → `REENTER_SUCCEEDED`
4. Never flip a failed row to pass

**Invariant:**

> Failed records are never mutated to pass. Success creates a new intake attempt.

---

## 10. Tables Owned by Gate Zero

| Table | Purpose |
|-------|---------|
| `cl.gate_zero_intake` | Incoming company candidates |
| `cl.gate_zero_recovery` | Failed records awaiting retry |
| `cl.gate_zero_air` | AIR event log for Gate Zero |

---

## 11. Guard Rails

| Guard Rail | Type | Action |
|------------|------|--------|
| Max attempts exceeded | Throttle | Mark EXHAUSTED |
| Early retry attempt | Validation | Reject |
| Missing required field | Validation | Reject at intake |
| Duplicate intake_id | Validation | Reject |
| Recovery window expired | Throttle | Freeze batch |

---

## 12. Kill Switch

* **Endpoint:** `/cl/gate-zero/kill-switch`
* **Activation Criteria:** Batch-level anomaly detected
* **Effect:** Pause all Gate Zero processing for batch
* **Emergency Contact:** SHQ / Barton Ops

---

## 13. Invariants

| ID | Invariant |
|----|-----------|
| INV-GZ-001 | Gate Zero uses `intake_id` only; never `sovereign_company_id` |
| INV-GZ-002 | Gate Zero performs binary existence verification only |
| INV-GZ-003 | Gate Zero never enriches authoritative tables |
| INV-GZ-004 | All failures route to recovery with throttles |
| INV-GZ-005 | Recovery success creates new intake attempt, never mutates failed row |
| INV-GZ-006 | Sovereign IDs minted only by downstream Mint Worker |
| INV-GZ-007 | Authorization travels by AIR |

---

## 14. Failure Modes

| Failure | Severity | Remediation |
|---------|----------|-------------|
| LinkedIn API unavailable | Medium | Defer attempt, retry later |
| Domain probe timeout | Low | Mark as DOMAIN_NOT_FOUND |
| Recovery queue overflow | High | Pause batch, alert ops |
| AIR write failure | Critical | Halt processing, investigate |

---

## 15. Observability

* **Logs:** Gate Zero AIR table (immutable)
* **Metrics:** Pass rate, fail rate by reason, recovery success rate, exhaustion rate
* **Alerts:** High fail rate, AIR write failures, recovery queue size

---

## Approval

| Role     | Name | Date |
| -------- | ---- | ---- |
| Owner    |      |      |
| Reviewer |      |      |
