# Company Lifecycle Hub - Obsidian Index

#hub #company-lifecycle #cl #doctrine

---

## Quick Links

### Doctrine
- [[CL_DOCTRINE]] - Core doctrine
- [[COMPANY_LIFECYCLE_LOCK]] - Intake invariants (LOCKED)
- [[heir.doctrine.yaml]] - Machine-readable doctrine

### Architecture Decisions
- [[ADR-001-lifecycle-state-machine]] - CL as Sovereign Authority
- [[ADR-002-gate-zero-pre-sovereign-verification]] - Gate Zero Stage
- [[ADR-003-identity-anchor-state-expansion]] - Identity Anchors & States
- [[ADR-004-identity-funnel-implementation]] - 5-Pass Funnel
- [[ADR-005-four-hub-architecture]] - Four-Hub System
- [[ADR-006-multi-state-intake-doctrine-lock]] - Multi-State Lock

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
| Sovereign IDs | 71,820 |
| HIGH Confidence | 4,809 |
| MEDIUM Confidence | 4,530 |
| States Active | NC, DE |
| Doctrine Version | 1.4 |

---

## Source Streams

| Stream | State | Adapter | Status |
|--------|-------|---------|--------|
| SS-001 | NC | NCExcelSourceAdapter | Active |
| SS-002 | DE | DECsvSourceAdapter | Active |

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

#company-lifecycle #cl #identity #sovereign #doctrine #gate-zero #multi-state #delaware #north-carolina

---

## Navigation

| Section | Path |
|---------|------|
| ADRs | `docs/adr/` |
| PRDs | `docs/prd/` |
| Schemas | `docs/schema/` |
| Doctrine | `docs/doctrine/` |
| Handoffs | `docs/handoff/` |
| Checklists | `docs/checklists/` |
| IMO | `docs/imo/` |
| Pipeline | `pipeline/` |

---

## Recent Changes

| Date | Change | Reference |
|------|--------|-----------|
| 2026-01-13 | Multi-state intake doctrine lock | ADR-006 |
| 2026-01-13 | Delaware adapter created | source_de_csv.js |
| 2026-01-13 | Compile-time guards added | ingest.js |
| 2026-01-13 | Downstream handoff created | DOWNSTREAM_SUB_HUB_HANDOFF.md |

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
