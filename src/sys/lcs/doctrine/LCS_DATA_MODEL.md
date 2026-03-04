# LCS Data Model — Schema Contract Reference

**Status**: ACTIVE
**Authority**: HUB-CL-001, SUBHUB-CL-LCS
**CTB Placement**: `src/sys/lcs/`
**Version**: 2.3.0

---

## Purpose

This document declares the complete data model for LCS. Every table and view is listed here with its classification, mutability, and purpose.

---

## Table Inventory

| Table | Classification | Mutable | Purpose |
|-------|---------------|---------|---------|
| `lcs.event` | CET | APPEND-ONLY | All communication events, partitioned monthly on created_at |
| `lcs.err0` | Error Log | APPEND-ONLY | Processing failures with ORBT strike tracking |
| `lcs.signal_registry` | Registry | CONFIG (INSERT/UPDATE, no DELETE) | Known signal sets per phase |
| `lcs.frame_registry` | Registry | CONFIG (INSERT/UPDATE, no DELETE) | Known frames with required_fields + fallback_frame |
| `lcs.adapter_registry` | Registry | CONFIG (INSERT/UPDATE, no DELETE) | Known delivery adapters with channel codes |
| `lcs.signal_queue` | Staging | APPEND-ONLY | Queued signal sets awaiting CID compilation |
| `lcs.cid` | Pipeline (CANONICAL) | APPEND-ONLY | Communication Identity Document — compiled communication intent |
| `lcs.sid_output` | Pipeline (STAGING) | APPEND-ONLY | Structured Identity Document — constructed message content |
| `lcs.mid_sequence_state` | Pipeline (STAGING) | APPEND-ONLY | Message Identity Document — delivery sequencing and attempt tracking |

## View Inventory

| View | Type | Source | Refresh | Purpose |
|------|------|--------|---------|---------|
| `lcs.v_latest_by_entity` | Materialized | lcs.event | Nightly 2:30 AM | Latest event per entity |
| `lcs.v_latest_by_company` | Materialized | lcs.event | Nightly 2:30 AM | Latest event per company |
| `lcs.v_company_intelligence` | Materialized | Cross-sub-hub JOIN (People + DOL + Blog + Sitemap) | Nightly 2:00 AM | Pre-assembled intelligence snapshot with computed intelligence_tier |

## Pipeline Data Flow (CID → SID → MID)

```
signal_queue ──→ CID Compiler ──→ lcs.cid (COMPILED)
                                      │
                                      ├── NOTIFY lcs_sid_worker
                                      ▼
                                 SID Worker ──→ lcs.sid_output (CONSTRUCTED)
                                                    │
                                                    ▼
                                               MID Engine ──→ lcs.mid_sequence_state (DELIVERED/FAILED)
                                                                  │
                                                                  ▼
                                                             lcs.event (CET record)
```

### ID Minting Contracts

| ID | Minted By | Format | Uniqueness |
|----|-----------|--------|------------|
| `communication_id` | CID Compiler | `LCS-{PHASE}-{YYYYMMDD}-{ULID}` | UNIQUE per cid row |
| `message_run_id` | MID Engine | `RUN-{COMM_ID}-{CHANNEL}-{ATTEMPT}` | NOT unique (multiple attempts) |

---

## Schema: lcs

All LCS objects live in the `lcs` schema. No LCS objects exist outside this schema. No non-LCS objects exist inside this schema.

---

## Mutability Rules

| Classification | INSERT | UPDATE | DELETE |
|---------------|--------|--------|--------|
| CET | YES | NO (immutability trigger) | NO |
| Error Log | YES | NO | NO |
| Registry | YES | YES (config changes) | NO (soft-deactivate via is_active = false) |
| Staging | YES | NO | NO |
| Pipeline (CANONICAL/STAGING) | YES | NO (append-only trigger) | NO (append-only trigger) |
| Materialized View | REFRESH CONCURRENTLY | N/A | N/A |

---

## Relationships (Join Paths)

```
lcs.signal_queue
    │
    └── signal_set_hash ──→ lcs.cid (triggers compilation)

lcs.cid
    │
    ├── sovereign_company_id ──→ cl.company_identity (by value, not FK)
    ├── signal_queue_id ──→ lcs.signal_queue (by value)
    ├── frame_id ──→ lcs.frame_registry (by value)
    ├── signal_set_hash ──→ lcs.signal_registry (by value)
    │
    └── communication_id ──→ lcs.sid_output (1:1, NOTIFY trigger)

lcs.sid_output
    │
    ├── communication_id ──→ lcs.cid (by value)
    ├── frame_id ──→ lcs.frame_registry (by value)
    │
    └── communication_id ──→ lcs.mid_sequence_state (1:N)

lcs.mid_sequence_state
    │
    ├── communication_id ──→ lcs.cid (by value)
    ├── adapter_type ──→ lcs.adapter_registry (by value)
    │
    └── message_run_id ──→ lcs.event (carried to CET)

lcs.event
    │
    ├── sovereign_company_id ──→ cl.company_identity (by value, not FK)
    ├── signal_set_hash ──→ lcs.signal_registry (by value)
    ├── frame_id ──→ lcs.frame_registry (by value)
    ├── adapter_type ──→ lcs.adapter_registry (by value)
    │
    ├── communication_id ──→ (LCS-minted, ULID-based, UNIQUE)
    └── message_run_id ──→ (LCS-minted, structured, NOT unique)

lcs.err0
    │
    └── message_run_id ──→ (matches lcs.event.message_run_id by value)
```

All relationships are **by value**, not by foreign key constraint. This ensures:
- CET writes are never blocked by registry state
- ERR0 writes are never blocked by CET state
- Views are derived, never authoritative

---

## What This Data Model Does NOT Include

| Excluded | Reason |
|----------|--------|
| Trigger tables | No runtime triggers in LCS (note: append-only enforcement and SID notify triggers exist but are infrastructure, not business logic) |
| State machine tables | LCS records state, does not manage it |
| History/changelog tables | CET is already append-only (it IS the history) |
| Enrichment tables | LCS does not enrich |
| Scoring tables | Scoring is a separate concern |

---

## Contract Files

| File | Location | Defines |
|------|----------|---------|
| `lcs_event.schema.sql` | `src/sys/lcs/contracts/` | CET schema with partitions, indexes, constraints, immutability trigger |
| `lcs_err0.schema.sql` | `src/sys/lcs/contracts/` | Error table with ORBT strike columns |
| `lcs_signal_registry.schema.sql` | `src/sys/lcs/contracts/` | Signal registry with freshness fields |
| `lcs_frame_registry.schema.sql` | `src/sys/lcs/contracts/` | Frame registry with required_fields JSONB + CID/SID/MID integration columns |
| `lcs_adapter_registry.schema.sql` | `src/sys/lcs/contracts/` | Adapter registry with channel codes |
| `lcs_latest_by_entity.view.sql` | `src/sys/lcs/contracts/` | Entity materialized view |
| `lcs_latest_by_company.view.sql` | `src/sys/lcs/contracts/` | Company materialized view |
| `005_lcs_cid_sid_mid.sql` | `migrations/lcs/` | CID/SID/MID pipeline tables, append-only triggers, SID notify trigger, frame_registry ALTER |
| `005_lcs_cid_sid_mid_rollback.sql` | `migrations/lcs/` | Rollback for migration 005 |

---

## Resolved Specifications

| Item | Resolution |
|------|------------|
| Schema name | `lcs` — confirmed |
| Registry DELETE policy | NO DELETE. Soft-deactivate only via `is_active = false`. Registries are append-forward. Old entries are deactivated, never removed. This preserves CET referential integrity by value. |
| Materialized view refresh strategy | Scheduled via Supabase cron. `v_company_intelligence` at 2:00 AM, entity/company views at 2:30 AM. REFRESH MATERIALIZED VIEW CONCURRENTLY (non-blocking). |
| Index strategy for CET | Monthly RANGE partition on `created_at`. 7 standard indexes + 2 partial indexes (failed deliveries, pending deliveries). All defined in DDL migration, not retrofitted. PostgreSQL 11+ auto-creates per-partition indexes. |
| Retention/archival policy | All partitions retained in v1 (append-only). Partitions older than 12 months are candidates for DETACH + archive to cold storage if cost is a factor. ERR0 not partitioned (volume is 100-1000x smaller than CET). |

---

## Document Control

| Field | Value |
|-------|-------|
| Hub | HUB-CL-001 |
| Sub-Hub | SUBHUB-CL-LCS |
| Version | 2.3.0 |
| Status | ACTIVE |
| Last Updated | 2026-03-03 |
