# AIR Doctrine

**Action / Incident / Result — Deterministic Process Telemetry**

---

## Preamble

This document defines **AIR (Action / Incident / Result)** as the canonical telemetry contract for lifecycle stages within Company Lifecycle (CL).

AIR is **not logging**. AIR is **not metrics**. AIR is **not debugging**.

**AIR is deterministic process telemetry for humans *and* AI.**

This doctrine is **frozen**. Modifications require formal governance review.

---

## 1. What AIR Stands For

| Letter | Meaning | Plain English |
|--------|---------|---------------|
| **A** | Action | What was attempted |
| **I** | Incident | What went wrong (or noteworthy condition) |
| **R** | Result | What happened because of it |

---

## 2. Why AIR Exists

AIR exists so that:

- AI can **route itself to the correct stage**
- AI can **retry or repair the correct process**
- Humans can **audit exactly where the pipeline stalled**
- Nothing relies on stack traces or vibes

**This is how self-healing works without guessing.**

---

## 3. Canonical Definition

> **AIR records are immutable, structured event records emitted whenever a lifecycle action produces a meaningful outcome (success, failure, deferral, or authorization).**

---

## 4. Core Schema (Non-Negotiable)

Every AIR table must include these fields:

| Field | Type | Description |
|-------|------|-------------|
| `air_event_id` | UUID | Primary key. Unique per event. |
| `entity_type` | TEXT | Type of entity: `intake`, `sovereign`, etc. |
| `entity_id` | UUID | The entity this event relates to. |
| `stage_id` | TEXT | WHERE — which stage emitted this event. |
| `process_id` | TEXT | WHAT — which specific action was taken. |
| `event_type` | TEXT | Outcome category (see Section 5). |
| `reason_code` | TEXT | Specific reason within that category. |
| `event_timestamp` | TIMESTAMPTZ | When this event occurred. Immutable. |

### Optional but Recommended

| Field | Type | Description |
|-------|------|-------------|
| `batch_id` | TEXT | Annual run / import batch identifier. |
| `payload_ref` | TEXT | Pointer to row / blob / external payload. |
| `actor` | TEXT | Who triggered: `system`, `ai`, `human`. |

---

## 5. Event Types (Canonical Set)

| Event Type | Description | When Used |
|------------|-------------|-----------|
| `ATTEMPT` | Processing has begun | Start of any action |
| `PASS` | Internal success (pre-authorization) | After checks pass |
| `FAIL` | Processing failed | After any failure |
| `AUTH` | Authorization granted | Signals downstream eligibility |
| `MINT` | Sovereign identity created | Only from Mint Worker |
| `EXHAUSTED` | Max retries reached | Terminal failure state |
| `REENTER` | Successful recovery | New attempt after recovery |

**Critical distinction:**

- `AUTH` = "You may proceed" (permission)
- `MINT` = "Identity created" (action)

Gate Zero emits `AUTH`. Sovereign Mint Worker emits `MINT`.

---

## 6. Immutability Rules

### AIR records are APPEND-ONLY

| Operation | Permitted |
|-----------|-----------|
| INSERT | YES |
| UPDATE | **NO** |
| DELETE | **NO** |

### Invariants

| Invariant | Description |
|-----------|-------------|
| **UNIQUE** | No two records share the same `air_event_id`. |
| **IMMUTABLE** | Once written, AIR records cannot be changed. |
| **COMPLETE** | Every meaningful outcome emits an AIR record. |
| **ORDERED** | Events for an entity are chronologically ordered. |
| **TRACEABLE** | Every record includes stage, process, and reason. |

---

## 7. AIR per Stage (Recommended Pattern)

AIR tables are **local to each stage**. This is the recommended pattern:

```
company_lifecycle/
  gate_zero/
    gate_zero_air.sql
  sovereign_mint/
    sovereign_mint_air.sql
  outreach/
    outreach_air.sql
  ...
```

**Why local AIR tables?**

- Localized ownership
- Simple to reason about
- AI knows exactly where to look
- Clear stage boundaries

Later, you can create a **read-only UNION view** (`air_master_view`) for cross-stage queries. But the underlying tables remain stage-local.

---

## 8. Downstream Subscription Pattern

AIR is the **contract** for downstream workers. Workers subscribe to AIR events, not table states.

### Pattern

```
┌─────────────────┐
│   Stage A       │
│   (emits AIR)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Stage A AIR   │  ◄─── Downstream workers poll/subscribe
└────────┬────────┘
         │
         │  (Worker reads AIR, then reads source table)
         ▼
┌─────────────────┐
│   Stage B       │
│   (acts on data)│
└─────────────────┘
```

### Invariant

> **Authorization travels by AIR. Data stays where it was created.**

Workers read AIR for signals, then read source tables for data. No copying data between stages.

---

## 9. Stage-Specific AIR Tables

### Gate Zero AIR

| Field | Value |
|-------|-------|
| `entity_type` | `intake` |
| `stage_id` | `GATE_ZERO` |
| `process_id` | `VERIFY_COMPANY_EXISTENCE` |
| Event Types | `ATTEMPT`, `PASS`, `FAIL`, `AUTH`, `EXHAUSTED`, `REENTER` |

### Sovereign Mint AIR (Future)

| Field | Value |
|-------|-------|
| `entity_type` | `intake` (input) → `sovereign` (output) |
| `stage_id` | `SOVEREIGN_MINT` |
| `process_id` | `MINT_COMPANY_IDENTITY` |
| Event Types | `ATTEMPT`, `MINT`, `FAIL` |

### Lifecycle Promotion AIR (Future)

| Field | Value |
|-------|-------|
| `entity_type` | `sovereign` |
| `stage_id` | `LIFECYCLE_PROMOTION` |
| `process_id` | `PROMOTE_TO_SALES`, `PROMOTE_TO_CLIENT`, etc. |
| Event Types | `ATTEMPT`, `PROMOTE`, `FAIL`, `AUTH` |

---

## 10. Reason Codes

Reason codes are **finite enums per stage**. Each stage defines its own reason codes.

### Gate Zero Reason Codes

| Event Type | Reason Codes |
|------------|--------------|
| `ATTEMPT` | `START`, `RETRY` |
| `PASS` | `CHECKS_PASSED` |
| `FAIL` | `DOMAIN_NOT_FOUND`, `DOMAIN_NO_IMPRINT`, `NO_LINKEDIN_COMPANY`, `STATE_MISMATCH`, `STATE_AMBIGUOUS`, `STATE_MISSING`, `API_UNAVAILABLE`, `TIMEOUT` |
| `AUTH` | `EXISTENCE_CONFIRMED` |
| `EXHAUSTED` | `MAX_ATTEMPTS_REACHED` |
| `REENTER` | `RECOVERY_SUCCESS` |

### Sovereign Mint Reason Codes (Future)

| Event Type | Reason Codes |
|------------|--------------|
| `ATTEMPT` | `START` |
| `MINT` | `IDENTITY_CREATED` |
| `FAIL` | `DUPLICATE_DETECTED`, `VALIDATION_FAILED` |

---

## 11. Anti-Patterns

| Anti-Pattern | Why Wrong |
|--------------|-----------|
| Using AIR for debugging | AIR is process telemetry, not stack traces |
| Updating AIR records | AIR is append-only |
| Skipping ATTEMPT events | Every action starts with ATTEMPT |
| Emitting AUTH without ownership | Only the authorized stage emits AUTH |
| Emitting MINT from non-mint stages | Only Sovereign Mint Worker emits MINT |
| Relying on AIR for data | AIR carries signals; source tables carry data |

---

## 12. Guarantees

AIR provides the following guarantees:

| Guarantee | Description |
|-----------|-------------|
| **Completeness** | Every meaningful outcome is recorded |
| **Immutability** | Records cannot be altered after creation |
| **Traceability** | Every record identifies stage, process, and reason |
| **Auditability** | Full history available for any entity |
| **Subscribeability** | Downstream workers can reliably subscribe to events |

---

## 13. Final Declaration

> **AIR is the nervous system of lifecycle processing.**
>
> **It is how stages communicate outcomes.**
>
> **It is how workers know what to do next.**
>
> **It is how humans and AI audit the pipeline.**
>
> **AIR is not optional. AIR is not logging. AIR is the contract.**

---

**Doctrine Version:** 1.0
**Status:** Locked
**Last Updated:** 2025-12-31
