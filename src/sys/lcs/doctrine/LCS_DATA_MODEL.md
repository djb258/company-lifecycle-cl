# LCS Data Model — Schema Contract Reference

**Status**: DRAFT
**Authority**: HUB-CL-001
**CTB Placement**: `src/sys/lcs/`
**Version**: 0.1.0

---

## Purpose

This document declares the complete data model for LCS. Every table and view is listed here with its classification, mutability, and purpose.

---

## Table Inventory

| Table | Classification | Mutable | Purpose |
|-------|---------------|---------|---------|
| `lcs.event` | CET (Canonical Event Table) | APPEND-ONLY | Records all communication events |
| `lcs.err0` | Error Log | APPEND-ONLY | Records all processing failures |
| `lcs.signal_registry` | Registry | YES (config) | Declares known signal sets |
| `lcs.frame_registry` | Registry | YES (config) | Declares known message frames |
| `lcs.adapter_registry` | Registry | YES (config) | Declares known delivery adapters |

## View Inventory

| View | Type | Source | Purpose |
|------|------|--------|---------|
| `lcs.v_latest_by_entity` | Materialized | `lcs.event` | Latest event per entity |
| `lcs.v_latest_by_company` | Materialized | `lcs.event` | Latest event per company |

---

## Schema: lcs

All LCS objects live in the `lcs` schema. No LCS objects exist outside this schema. No non-LCS objects exist inside this schema.

---

## Mutability Rules

| Classification | INSERT | UPDATE | DELETE |
|---------------|--------|--------|--------|
| CET | YES | NO | NO |
| Error Log | YES | NO | NO |
| Registry | YES | YES | [[TBD_BY_HUMAN]] |
| Materialized View | REFRESH | N/A | N/A |

---

## Relationships (Join Paths)

```
lcs.event
    │
    ├── sovereign_company_id ──→ cl.company_identity (by value, not FK)
    ├── signal_set_hash ──→ lcs.signal_registry (by value)
    ├── frame_id ──→ lcs.frame_registry (by value)
    ├── adapter_type ──→ lcs.adapter_registry (by value)
    │
    └── process_id ──→ (external, opaque reference)

lcs.err0
    │
    └── process_id ──→ (matches lcs.event.process_id by value)
```

All relationships are **by value**, not by foreign key constraint. This ensures:
- CET writes are never blocked by registry state
- ERR0 writes are never blocked by CET state
- Views are derived, never authoritative

---

## What This Data Model Does NOT Include

| Excluded | Reason |
|----------|--------|
| Trigger tables | No runtime triggers in LCS |
| State machine tables | LCS records state, does not manage it |
| Queue tables | LCS is a ledger, not a queue |
| History/changelog tables | CET is already append-only (it IS the history) |
| Enrichment tables | LCS does not enrich |
| Scoring tables | Scoring is a separate concern |

---

## Contract Files

| File | Defines |
|------|---------|
| `contracts/lcs_event.schema.sql` | CET schema |
| `contracts/lcs_err0.schema.sql` | Error table schema |
| `contracts/lcs_signal_registry.schema.sql` | Signal registry schema |
| `contracts/lcs_frame_registry.schema.sql` | Frame registry schema |
| `contracts/lcs_adapter_registry.schema.sql` | Adapter registry schema |
| `contracts/lcs_latest_by_entity.view.sql` | Entity materialized view |
| `contracts/lcs_latest_by_company.view.sql` | Company materialized view |

---

## [[TBD_BY_HUMAN]]

- [ ] Confirm schema name (`lcs`) is approved
- [ ] Confirm registry DELETE policy (soft-delete vs hard-delete vs immutable)
- [ ] Define materialized view refresh strategy (on-demand vs scheduled)
- [ ] Confirm index strategy for CET (time-based partitioning?)
- [ ] Define retention/archival policy

---

## Document Control

| Field | Value |
|-------|-------|
| Hub | HUB-CL-001 |
| Version | 0.1.0 |
| Status | DRAFT |
| Last Updated | 2026-02-06 |
