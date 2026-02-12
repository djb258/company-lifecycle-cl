# LCS ID Model — Dual-ID Enforcement

**Status**: ACTIVE
**Authority**: HUB-CL-001, SUBHUB-CL-LCS
**CTB Placement**: `src/sys/lcs/`
**Version**: 2.2.0

---

## Purpose

LCS enforces a **dual-ID model** that separates the message artifact from the execution context. Every event in the canonical event table carries both IDs. They are independent, immutable, and never conflated.

---

## The Two IDs

### communication_id

| Attribute | Value |
|-----------|-------|
| **Represents** | The message artifact — WHY this event exists |
| **Format** | `LCS-{PHASE}-{YYYYMMDD}-{ULID}` (e.g., `LCS-OUT-20260211-01HQXK5V9P`) |
| **ID Strategy** | ULID — timestamp-encoded (sortable), cryptographically random (unique), non-blocking (no shared counter) |
| **Minted by** | `id_minter.ts` in `src/app/lcs/` at Pipeline Step 4 |
| **Cardinality** | One per composition decision |
| **Immutable** | YES — UNIQUE constraint + immutability trigger on CET (no updates ever) |
| **Scope** | Spans the lifecycle of a single message |

A `communication_id` answers: *"What message was this, and why does it exist?"*

### message_run_id

| Attribute | Value |
|-----------|-------|
| **Represents** | The delivery attempt — WHO sent it, WHICH channel, WHICH attempt number |
| **Format** | `RUN-{COMM_ID}-{CHANNEL}-{ATTEMPT}` (e.g., `RUN-LCS-OUT-20260211-01HQXK5V9P-MG-001`) |
| **ID Strategy** | Structured, parseable — carries channel code and attempt number in the ID itself |
| **Minted by** | `id_minter.ts` in `src/app/lcs/` at Pipeline Step 6 |
| **Cardinality** | One per delivery attempt (same communication_id can have multiple message_run_ids) |
| **Immutable** | YES — never updated after creation |
| **Scope** | A single delivery attempt on a single channel |

A `message_run_id` answers: *"Which specific delivery attempt was this?"*

---

## Relationship

```
communication_id (1) ──── (N) message_run_id

One composition decision produces one or more delivery attempts.
One delivery attempt belongs to exactly one composition.

Example:
  communication_id: LCS-OUT-20260211-01HQXK5V9P
    ├── RUN-LCS-OUT-20260211-01HQXK5V9P-MG-001  (Mailgun, attempt 1 — BOUNCED)
    ├── RUN-LCS-OUT-20260211-01HQXK5V9P-MG-002  (Mailgun, attempt 2 — FAILED)
    └── RUN-LCS-OUT-20260211-01HQXK5V9P-HR-001  (HeyReach, attempt 1 — DELIVERED)
```

---

## Rules

| Rule | Enforcement |
|------|-------------|
| communication_id is UNIQUE per CET row | UNIQUE constraint in DDL |
| communication_id is IMMUTABLE after insert | DB trigger blocks UPDATE on this column |
| message_run_id is NOT unique per CET row | Multiple attempts share one composition |
| Both IDs are minted by id_minter.ts | Nothing external mints LCS IDs |
| communication_id format is validated | CHECK constraint or app-level regex: `^LCS-(OUT\|SAL\|CLI)-\d{8}-[A-Z0-9]{10,}$` |
| message_run_id format is validated | Pattern: `^RUN-LCS-(OUT\|SAL\|CLI)-\d{8}-[A-Z0-9]{10,}-(MG\|HR\|SH)-\d{3}$` |
| Both IDs are required on every CET row | NOT NULL constraint |
| Neither ID is a foreign key to external tables | Reference by value only |

---

## What LCS Does NOT Do With IDs

| Prohibited | Reason |
|------------|--------|
| Allow external systems to mint communication_id | `id_minter.ts` in `src/app/lcs/` is the sole minting authority |
| Allow external systems to mint message_run_id | `id_minter.ts` in `src/app/lcs/` is the sole minting authority |
| Use opaque UUIDs | IDs are structured and parseable — ULID suffix for communication_id, structured format for message_run_id |
| Join to external tables via FK | Reference by value only |
| Update either ID after insert | Append-only — no mutations |

---

## External Identity References

LCS also carries identifiers from external systems, referenced by value only:

| Field | Source | Purpose |
|-------|--------|---------|
| `sovereign_company_id` | `cl.company_identity` | Which company this event relates to |
| `entity_id` | Upstream entity resolution | Which entity (slot or person) received the communication |

These are **not foreign keys**. LCS stores the value at time of insert. If the upstream identity changes, LCS retains the original reference.

---

## Document Control

| Field | Value |
|-------|-------|
| Hub | HUB-CL-001 |
| Sub-Hub | SUBHUB-CL-LCS |
| Version | 2.2.0 |
| Status | ACTIVE |
| Last Updated | 2026-02-12 |
