# LCS Overview — Lifecycle Communication Spine

**Status**: ACTIVE
**Authority**: HUB-CL-001, SUBHUB-CL-LCS
**CTB Placement**: `src/sys/lcs/`
**Version**: 2.2.0

---

## Purpose

LCS (Lifecycle Communication Spine) is the **canonical communication orchestration engine** for the Company Lifecycle hub. It owns the complete signal-to-delivery pipeline: receive signal, collect intelligence, match frame, mint IDs, resolve audience, call adapter, log result, handle errors. LCS operates across three lifecycle phases (OUTREACH, SALES, CLIENT) using the same 9-step IMO pipeline with different signal contracts, frame registries, and sender identities per phase.

---

## What LCS Does

| Capability | Description |
|------------|-------------|
| Orchestrates communication pipeline | 9-step IMO: Signal → Collect → Frame → Mint → Audience → Adapter → Log → Error |
| Records all events | Append-only CET (lcs.event) — every step logs |
| Enforces dual-ID model | communication_id (ULID, message artifact) + message_run_id (execution attempt) |
| Classifies by lifecycle phase | OUTREACH, SALES, CLIENT — same pipeline, different configs |
| Enforces suppression & cooldown | 4-state machine (ACTIVE → COOLED → PARKED → SUPPRESSED), per-recipient frequency cap, company throttle, never_contact flag |
| Gates on capacity | Bi-directional: founder calendar gate (global) + per-agent territory gate (per territory) |
| Gates on data freshness | People stale = hard block. Other sub-hubs stale = tier downgrade. Proactive freshness alerts. |
| Registers signals, frames, adapters | Declarative registries with version tracking |
| Surfaces latest state | Materialized views for entity, company, and cross-sub-hub intelligence snapshot |
| Captures errors | ERR0 table with ORBT 3-strike protocol |

---

## What LCS Does NOT Do

| Prohibited | Reason |
|------------|--------|
| Generate message copy | Copy is composed by AI layer upstream, guided by frame templates. LCS selects the frame, not the words. |
| Write to sub-hub tables | LCS reads from People, DOL, Blog, Sitemap, AFLAC. Never writes to them. Sub-hub sovereignty. |
| Score entities with ML | v1 is deterministic. Hard cutoffs. No inference. No gray areas. |
| Manage adapter connections | Adapters are registered and called. Connection management is adapter-internal. |
| Mint sovereign identity | sovereign_company_id comes from cl.company_identity. LCS references by value. |

---

## Boundaries

```
UPSTREAM (provides signals to LCS)
    │
    │  Outreach signals, Sales signals, Client signals,
    │  Calendly webhooks, Reply ingestion, AFLAC data
    │  (via SPOKE-CL-I-010 through I-015)
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                        LCS                              │
│                                                         │
│  GATES: capacity_gate · suppression_engine · freshness  │
│  MIDDLE: signal_collector → frame_matcher →             │
│          audience_resolver → id_minter → runtime        │
│  TABLES: CET (lcs.event) · ERR0 (lcs.err0)            │
│  REGISTRIES: signal · frame · adapter                   │
│  VIEWS: latest_by_entity · latest_by_company ·          │
│         v_company_intelligence (cross-sub-hub snapshot)  │
│                                                         │
└─────────────────────────────────────────────────────────┘
    │
    │  Compiled payloads → adapters → delivery status
    │  (via SPOKE-CL-O-010 through O-012)
    │
    ▼
DOWNSTREAM (receives from LCS)
    Mailgun (email delivery)
    HeyReach (LinkedIn delivery)
    Sales Hub (meeting handoff)

    FEEDBACK LOOP: bounces → People update
                   complaints → suppression update
                   unsubscribes → suppression update
                   meetings → Sales handoff
```

---

## Relationship to HEIR

LCS references sovereign identity by value only:

- `sovereign_company_id` — from `cl.company_identity` (never minted by LCS)
- Entity resolution — from People sub-hub via materialized intelligence view
- Agent assignment — from Coverage model via `coverage.agent_assignment`

LCS does NOT mint, verify, or modify identities. LCS does NOT write to any table outside the `lcs` schema.

---

## Resolved Specifications

| Item | Resolution |
|------|------------|
| lifecycle_phase enum | `OUTREACH \| SALES \| CLIENT` |
| status enum | `PENDING \| SENT \| DELIVERED \| OPENED \| CLICKED \| REPLIED \| BOUNCED \| FAILED \| SIGNAL_DROPPED \| COMPOSITION_BLOCKED \| RECIPIENT_THROTTLED \| COMPANY_THROTTLED \| DATA_STALE \| FRAME_INELIGIBLE` |
| Retention policy | All CET partitions retained (append-only). Partitions >12mo candidates for DETACH + cold archive. ERR0 not partitioned in v1. |
| Materialized view refresh cadence | `v_company_intelligence` refreshes nightly at 2:00 AM. `v_latest_by_entity` and `v_latest_by_company` refresh nightly at 2:30 AM (30 min after intelligence, since entity views may reference intelligence data). |
| adapter_type enum | `MG` (Mailgun) \| `HR` (HeyReach) \| `SH` (Sales Handoff) |

---

## Document Control

| Field | Value |
|-------|-------|
| Hub | HUB-CL-001 |
| Sub-Hub | SUBHUB-CL-LCS |
| Version | 2.2.0 |
| Status | ACTIVE |
| Last Updated | 2026-02-12 |
