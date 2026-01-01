# Hub Compliance Checklist — Company Lifecycle Hub

This checklist must be completed before any hub can ship.
No exceptions. No partial compliance.

---

## Hub Identity

- [x] Hub ID assigned (unique, immutable): **HUB-CL-001**
- [x] Process ID assigned (execution / trace ID): **CL-PROC-001**
- [x] Hub Name defined: **Company Lifecycle Hub**
- [x] Hub Owner assigned: **Supreme Headquarters (SHQ)**

---

## CTB Placement

- [x] CTB path defined: **sys/company-lifecycle**
- [x] Branch level specified: **sys (40k)**
- [x] Parent hub identified: **None (Root Hub)**

---

## Altitude Scope

- [x] Altitude level declared: **20k**
- [x] Scope appropriate for declared altitude

---

## IMO Structure

### Ingress (I Layer)

- [x] Ingress points defined (UI Forms, API Gateway, Webhooks)
- [x] Ingress contains no logic
- [x] Ingress contains no state
- [x] UI (if present) is dumb ingress only

### Middle (M Layer)

- [x] All logic resides in M layer
- [x] All state resides in M layer
- [x] All decisions occur in M layer
- [x] Tools scoped to M layer only

### Egress (O Layer)

- [x] Egress points defined (Database, Notifications, Event Bus, Dashboard)
- [x] Egress contains no logic
- [x] Egress contains no state

---

## Spokes

- [x] All spokes typed as I or O only
- [x] No spoke contains logic
- [x] No spoke contains state
- [x] No spoke owns tools
- [x] No spoke performs decisions

---

## Tools

- [x] All tools scoped inside this hub (see PRD Section 9)
- [x] All tools have Doctrine ID: CL-TOOL-001 through CL-TOOL-004
- [x] All tools have ADR reference: ADR-001
- [x] No tools exposed to spokes

---

## Connectors

- [x] Connectors (API / CSV / Event) defined
- [x] Connector direction specified (Inbound / Outbound)
- [x] Connector contracts documented (see PRD Section 8)

---

## Cross-Hub Isolation

- [x] No sideways hub-to-hub calls
- [x] No cross-hub logic
- [x] No shared mutable state between hubs

---

## Guard Rails

- [x] Rate limits defined: 1000 identity mints per hour
- [x] Timeouts defined: 30 seconds for identity resolution
- [x] Validation implemented: Identity uniqueness, immutability
- [x] Permissions enforced: SHQ approval for overrides

---

## Kill Switch

- [x] Kill switch endpoint defined: `POST /api/cl/kill-switch`
- [x] Kill switch activation criteria documented (duplicate detection, unauthorized promotion, data integrity violation)
- [x] Kill switch tested and verified
- [x] Emergency contact assigned: SHQ Admin

---

## Rollback

- [x] Rollback plan documented (see ADR-001)
- [x] Rollback tested and verified

---

## Observability

- [x] Logging implemented: All state changes to cl.audit_trail
- [x] Metrics implemented: Identities minted/day, promotions/stage, gate satisfaction rate
- [x] Alerts configured: Duplicate mint, promotion gate failure, kill switch activation
- [x] Shipping without observability is forbidden

---

## Gate Zero Stage

### Pre-Sovereign Verification

- [x] Gate Zero uses `intake_id` only (never `sovereign_company_id`)
- [x] Binary existence verification (pass/fail only)
- [x] Gate Zero never enriches authoritative tables
- [x] Failures route to recovery table with throttles

### Recovery Throttles

- [x] Max attempts defined: 3
- [x] Backoff schedule defined: 24h → 72h → 168h
- [x] Recovery window defined: 14 days post-batch
- [x] Recovery success creates new intake (never mutates failed row)

### AIR Integration

- [x] AIR doctrine defined: docs/doctrine/AIR_DOCTRINE.md
- [x] Gate Zero AIR table defined: docs/schema/GATE_ZERO_AIR.md
- [x] Event types documented: ATTEMPT, PASS, FAIL, AUTH, EXHAUSTED, REENTER
- [x] Reason codes documented per event type
- [x] Gate Zero emits AUTH on success (not MINT)
- [x] Mint Worker subscribes to Gate Zero AIR for AUTH events

### Gate Zero Kill Switch

- [x] Kill switch endpoint defined: `/cl/gate-zero/kill-switch`
- [x] Batch-level pause supported
- [x] Emergency contact assigned: SHQ Admin

### Hardening Requirements

- [x] Promotion Contract defined (PRD Section 19)
- [x] Promotion rule documented: `company_name AND (domain OR linkedin)`
- [x] Non-blocking fields documented: `company_state`, `source_system`, `industry`, `employee_count`
- [x] Idempotency Guard implemented (PRD Section 20)
- [x] Company fingerprint formula defined: `LOWER(domain) || '|' || LOWER(linkedin)`
- [x] Unique index on `company_fingerprint` enforced
- [x] Lifecycle Run Versioning implemented (PRD Section 21)
- [x] `lifecycle_run_id` stamped on all lifecycle tables
- [x] Prior runs never overwritten

### Bootstrap Scripts

- [x] `neon/verify-companies.js` - Phase 1 diagnostics
- [x] `neon/phase-d-error-routing.js` - Error routing
- [x] `neon/phase-e-audit.js` - Audit and rollback
- [x] `neon/hardening-bootstrap.js` - Apply hardening

---

## Failure Modes

- [x] Failure modes documented (see PRD Section 13)
- [x] Severity levels assigned: CRITICAL, HIGH, MEDIUM
- [x] Remediation steps defined

---

## Human Override

- [x] Override conditions defined: Force promotion, identity merge, identity retirement
- [x] Override approvers assigned: SHQ Admin

---

## Traceability

- [x] PRD exists and is current: **docs/prd/PRD_COMPANY_LIFECYCLE.md**
- [x] PRD for Gate Zero: **docs/prd/PRD-GATE-ZERO.md**
- [x] ADR exists (if decisions required): **docs/adr/ADR-001-lifecycle-state-machine.md**
- [x] ADR for Gate Zero: **docs/adr/ADR-002-gate-zero-pre-sovereign-verification.md**
- [x] Linear issue linked: **CL-001**, **CL-002**
- [x] PR linked: Initial schema migration, Gate Zero documentation

---

## ERD & Data Flow

- [x] ERD document exists: `docs/schema/CL_ERD.md`
- [x] Canonical data flow documented in CL_DOCTRINE.md
- [x] Flow rules enforced: COPY-NEVER-MOVE, READ-ONLY-SOURCE, ONE-WAY-FLOW
- [x] No backward writes to source tables
- [x] ERROR → repair → re-entry loop documented
- [x] Idempotent identity minting (fingerprint)
- [x] Bridge table as only join surface for consumers

### Flow Tables

- [x] `cl.company_lifecycle_identity_staging` documented
- [x] `cl.company_identity` documented
- [x] `cl.company_identity_bridge` documented
- [x] `cl.company_lifecycle_error` documented

---

## Compliance Status

**Current Status:** COMPLIANT

**Blockers:** None

---

## Compliance Rule

If any box is unchecked, this hub may not ship.

---

## Approval

| Role | Name | Date |
|------|------|------|
| Hub Owner | SHQ | 2025-12-30 |
| Compliance Officer | | |
