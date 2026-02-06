# LCS Overview — Lifecycle Communication Spine

**Status**: DRAFT
**Authority**: HUB-CL-001
**CTB Placement**: `src/sys/lcs/`
**Version**: 0.1.0

---

## Purpose

LCS (Lifecycle Communication Spine) is the **canonical event ledger** for all communication events across the company lifecycle. It records WHAT was communicated, to WHOM, through WHICH adapter, at WHICH lifecycle phase.

LCS is a **system-level spine** — it provides structure and recording, not logic or orchestration.

---

## What LCS Does

| Capability | Description |
|------------|-------------|
| Records communication events | Append-only canonical event table (CET) |
| Tracks dual identity | `communication_id` (message artifact) + `process_id` (execution run) |
| Classifies by lifecycle phase | outreach, sales, client |
| Registers signal sets | Declarative registry of signal configurations |
| Registers frames | Declarative registry of message frames |
| Registers adapters | Declarative registry of delivery adapters |
| Surfaces latest state | Materialized views for entity and company lookups |
| Captures errors | Single ERR0 table for failure logging |

---

## What LCS Does NOT Do

| Prohibited | Reason |
|------------|--------|
| Generate message copy | LCS records events, not content. Copy is upstream. |
| Execute workflows | LCS is a ledger, not an orchestrator. |
| Make send/no-send decisions | Decision logic lives in M layer, not sys. |
| Score or rank entities | Scoring is a separate concern. |
| Retry failed sends | Retry logic is runtime, not spine. |
| Enrich data | LCS records what happened, not what should happen. |
| Trigger downstream actions | No triggers. Consumers poll or subscribe externally. |
| Manage adapter connections | Adapters are registered, not managed. |

---

## Boundaries

```
UPSTREAM (provides to LCS)
    │
    │  communication_id, process_id, entity, signal, frame, adapter
    │
    ▼
┌─────────────────────────────────────────┐
│              LCS                        │
│                                         │
│  CET (append-only event ledger)         │
│  ERR0 (append-only error log)           │
│  Registries (signal, frame, adapter)    │
│  Views (latest-by-entity, by-company)   │
│                                         │
└─────────────────────────────────────────┘
    │
    │  READ-ONLY views for consumers
    │
    ▼
DOWNSTREAM (reads from LCS)
```

LCS sits at the **sys** level of CTB. It is infrastructure, not application logic.

---

## Relationship to HEIR

LCS assumes HEIR identity already exists. It references sovereign identity by ID only:

- `sovereign_company_id` — from `cl.company_identity`
- `entity_id` — from upstream entity resolution

LCS does NOT mint, verify, or modify identities.

---

## [[TBD_BY_HUMAN]]

- [ ] Confirm lifecycle_phase enum values beyond (outreach | sales | client)
- [ ] Confirm status enum values for CET
- [ ] Define retention policy for CET and ERR0
- [ ] Define materialized view refresh cadence
- [ ] Confirm adapter_type enum values

---

## Document Control

| Field | Value |
|-------|-------|
| Hub | HUB-CL-001 |
| Version | 0.1.0 |
| Status | DRAFT |
| Last Updated | 2026-02-06 |
