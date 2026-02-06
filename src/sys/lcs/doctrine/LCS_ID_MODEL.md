# LCS ID Model — Dual-ID Enforcement

**Status**: DRAFT
**Authority**: HUB-CL-001
**CTB Placement**: `src/sys/lcs/`
**Version**: 0.1.0

---

## Purpose

LCS enforces a **dual-ID model** that separates the message artifact from the execution context. Every event in the canonical event table carries both IDs. They are independent, immutable, and never conflated.

---

## The Two IDs

### communication_id

| Attribute | Value |
|-----------|-------|
| **Represents** | The message artifact — WHY this event exists |
| **Type** | UUID |
| **Minted by** | Upstream process before LCS insertion |
| **Cardinality** | One per communication attempt |
| **Immutable** | YES — never updated after creation |
| **Scope** | Spans the lifecycle of a single message |

A `communication_id` answers: *"What message was this?"*

### process_id

| Attribute | Value |
|-----------|-------|
| **Represents** | The execution run — WHO triggered it, WHEN, HOW |
| **Type** | UUID |
| **Minted by** | Runtime orchestrator at execution start |
| **Cardinality** | One per execution run (may span multiple communications) |
| **Immutable** | YES — never updated after creation |
| **Scope** | Spans a batch, session, or pipeline run |

A `process_id` answers: *"Which run produced this?"*

---

## Relationship

```
process_id (1) ──────────── (N) communication_id

One execution run produces many communication events.
One communication event belongs to exactly one run.
```

---

## Rules

| Rule | Enforcement |
|------|-------------|
| Both IDs are required on every CET row | NOT NULL constraint |
| Neither ID may be updated after insert | Append-only table (no UPDATE) |
| Neither ID is a foreign key to external tables | Reference by value only |
| `communication_id` is unique per CET row | UNIQUE constraint |
| `process_id` is NOT unique per CET row | Many events share one run |
| IDs are minted upstream, not by LCS | LCS records, does not mint |

---

## What LCS Does NOT Do With IDs

| Prohibited | Reason |
|------------|--------|
| Mint communication_id | Minted upstream before LCS |
| Mint process_id | Minted by runtime orchestrator |
| Validate ID format | LCS accepts UUIDs, does not parse them |
| Join to external tables via FK | Reference by value only |
| Update either ID | Append-only — no mutations |

---

## External Identity References

LCS also carries identifiers from external systems, referenced by value only:

| Field | Source | Purpose |
|-------|--------|---------|
| `sovereign_company_id` | `cl.company_identity` | Which company this event relates to |
| `entity_id` | Upstream entity resolution | Which entity (slot or person) received the communication |

These are **not foreign keys**. LCS stores the value at time of insert. If the upstream identity changes, LCS retains the original reference.

---

## [[TBD_BY_HUMAN]]

- [ ] Confirm UUID generation strategy (v4 random vs v7 time-ordered)
- [ ] Confirm whether process_id should carry batch metadata or remain opaque
- [ ] Define process_id minting contract for upstream systems

---

## Document Control

| Field | Value |
|-------|-------|
| Hub | HUB-CL-001 |
| Version | 0.1.0 |
| Status | DRAFT |
| Last Updated | 2026-02-06 |
