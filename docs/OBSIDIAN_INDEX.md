# Company Lifecycle Hub - Obsidian Index

#hub #company-lifecycle #cl #doctrine

---

## Quick Links

### Doctrine
- [[CL_DOCTRINE]] - Core doctrine
- [[COMPANY_LIFECYCLE_LOCK]] - Intake invariants (LOCKED)
- [[heir.doctrine.yaml]] - Machine-readable doctrine
- [[LCS_OVERVIEW]] - Lifecycle Communication Spine architecture
- [[LCS_DATA_MODEL]] - LCS table inventory (5 tables + 2 views)
- [[LCS_ID_MODEL]] - Dual-ID enforcement (communication_id + process_id)

### Architecture Decisions
- [[ADR-001-lifecycle-state-machine]] - CL as Sovereign Authority
- [[ADR-002-gate-zero-pre-sovereign-verification]] - Gate Zero Stage
- [[ADR-003-identity-anchor-state-expansion]] - Identity Anchors & States
- [[ADR-004-identity-funnel-implementation]] - 5-Pass Funnel
- [[ADR-005-four-hub-architecture]] - Four-Hub System
- [[ADR-006-multi-state-intake-doctrine-lock]] - Multi-State Lock
- [[ADR-007-multi-state-batch-ingestion]] - Batch Ingestion Pipeline
- [[ADR-008-lifecycle-pointer-registry]] - Write-Once Lifecycle Pointers

### Run Logs
- [[RUN-2026-02-07-BATCH-OUTREACH-MANUAL-MINTING]] - 21 companies for outreach pipeline
- [[RUN-2026-02-04-HUNTER-DOL-INTAKE]] - 54,155 companies from Hunter DOL enrichment
- [[RUN-2026-01-14-MULTI-STATE-INGESTION]] - 2,350 companies across 8 states

### Product Requirements
- [[PRD_COMPANY_LIFECYCLE]] - Core PRD
- [[PRD-GATE-ZERO]] - Gate Zero PRD
- [[PRD-MULTI-STATE-INTAKE]] - Multi-State Intake PRD

### Schemas
- [[CL_ERD]] - Entity Relationship Diagram
- [[CL_COMPANY_IDENTITY]] - Identity Schema
- [[GATE_ZERO_INTAKE]] - Intake Schema
- [[CL_PASS_CONTRACTS]] - Funnel Pass Contracts

### IMO Documentation
- [[IMO-MULTI-STATE-INTAKE]] - Multi-State Intake IMO

### Handoffs
- [[OUTREACH_HANDOFF]] - Outreach Consumer Guide
- [[DOWNSTREAM_SUB_HUB_HANDOFF]] - Sub-Hub Implementation Guide

### Checklists
- [[HUB_COMPLIANCE]] - Compliance Checklist

---

## Current State

| Metric | Value |
|--------|-------|
| Active Companies | 106,086 |
| Archived (FAIL) | 22,263 |
| Total Processed | 128,349 |
| States Active | NC, DE, VA, MD, PA, OH, KY, WV, DC, WI, TX, ND, IA, MO, IL, KS, NE, OK |
| Doctrine Version | 2.0.0 |
| Lifecycle Pointers | outreach_id, sales_process_id, client_id |

---

## Source Streams

| Stream | State | Adapter | Status |
|--------|-------|---------|--------|
| MANUAL_OUTREACH_2026 | WI, TX, ND, IA, MO, IL, KS, NE, OK | Pipeline (orchestrator.js) | Completed (21) |
| hunter_dol_enrichment | OH, PA, VA, MD, NC, KY, DC, WV | Direct SQL | Completed (54,155) |
| SS-001 | NC | NCExcelSourceAdapter | Active |
| SS-002 | DE | DECsvSourceAdapter | Active |
| CLAY_MULTI_DE | DE | Batch Script | Completed |
| CLAY_MULTI_VA | VA | Batch Script | Completed |
| CLAY_MULTI_MD | MD | Batch Script | Completed |
| CLAY_MULTI_PA | PA | Batch Script | Completed |
| CLAY_MULTI_OH | OH | Batch Script | Completed |
| CLAY_MULTI_NC | NC | Batch Script | Completed |
| CLAY_MULTI_KY | KY | Batch Script | Completed |
| CLAY_MULTI_WV | WV | Batch Script | Completed |

---

## Locked Invariants

### CSV Contract
- `Name` — REQUIRED
- `Domain OR LinkedIn URL` — At least one required
- All other fields — Optional (raw_payload only)

### Identity Allowlist
```
company_name
company_domain
linkedin_url
```

### Compile-Time Guards
- Adapter inheritance verified
- Identity allowlist frozen
- State/source uniqueness enforced

---

## Tags

#company-lifecycle #cl #identity #sovereign #doctrine #gate-zero #multi-state #delaware #north-carolina #hunter-dol #dc #lcs #outreach

---

## Navigation

| Section | Path |
|---------|------|
| ADRs | `docs/adr/` |
| PRDs | `docs/prd/` |
| Schemas | `docs/schema/` |
| Doctrine | `docs/doctrine/` |
| LCS Doctrine | `src/sys/lcs/doctrine/` |
| LCS Contracts | `src/sys/lcs/contracts/` |
| Handoffs | `docs/handoff/` |
| Checklists | `docs/checklists/` |
| IMO | `docs/imo/` |
| Pipeline | `pipeline/` |

---

## Recent Changes

| Date | Change | Reference |
|------|--------|-----------|
| 2026-02-07 | Manual outreach batch (21 companies, 9 new states) | RUN-2026-02-07 |
| 2026-02-06 | LCS scaffold created (src/sys/lcs/) | LCS_OVERVIEW |
| 2026-02-06 | CTB compliance refactor (lib/ dirs eliminated) | CLAUDE.md |
| 2026-02-06 | Templates synced from imo-creator (v2.0.0) | CLAUDE.md |
| 2026-02-06 | CLAUDE.md rewritten as child hub identity | CLAUDE.md |
| 2026-02-04 | Hunter DOL enrichment intake (54,155 companies) | RUN-2026-02-04 |
| 2026-02-04 | DC state added (via Hunter DOL) | RUN-2026-02-04 |
| 2026-02-04 | Total active companies: 106,065 | ERD update |
| 2026-01-22 | Lifecycle pointer registry (write-once) | ADR-008 |
| 2026-01-22 | FAIL records archived (22,263) | archive-fail-final.js |
| 2026-01-22 | CL cleanup to 51,910 PASS | Migration 008 |
| 2026-01-22 | v_company_lifecycle_status view | Migration 008 |
| 2026-01-14 | Multi-state batch ingestion (2,350 companies) | ADR-007 |
| 2026-01-14 | 8-state expansion (DE, VA, MD, PA, OH, NC, KY, WV) | RUN-2026-01-14 |
| 2026-01-14 | Batch scripts created | scripts/*.cjs |
| 2026-01-13 | Multi-state intake doctrine lock | ADR-006 |
| 2026-01-13 | Delaware adapter created | source_de_csv.js |

---

## Pipeline Files

| File | Purpose |
|------|---------|
| `pipeline/ingest.js` | CLI entry point |
| `pipeline/orchestrator.js` | Verification & minting |
| `pipeline/lifecycle_worker.js` | Core verification logic |
| `pipeline/intake_service.js` | Database writes |
| `pipeline/adapters/state_csv_adapter.js` | Base class (LOCKED) |
| `pipeline/adapters/source_nc_excel.js` | NC adapter |
| `pipeline/adapters/source_de_csv.js` | DE adapter |
