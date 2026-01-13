# Hub Compliance Checklist — Company Lifecycle Hub

> **NOTE:** The multi-pass enrichment pipeline (pass-2 through pass-5) referenced below
> has been QUARANTINED. See `meta/legacy_quarantine/README.md`.
> The canonical pipeline is now: `cl.company_candidate → lifecycle_worker → mintIdentity`

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

## Identity Anchor & State Expansion (ADR-003)

### Identity Anchor Doctrine

- [x] Identity anchor rule documented: domain OR LinkedIn (not AND)
- [x] `website_url` nullable (not required)
- [x] `linkedin_url` nullable (not required)
- [x] `chk_identity_anchor` constraint enforces at least one anchor
- [x] ADR-003 authorizes identity anchor doctrine

### State Expansion Governance

- [x] `chk_state_valid` expanded via ADR authorization
- [x] Current states documented: PA, VA, MD, OH, WV, KY, DE, OK, NC
- [x] State expansion requires ADR (no silent changes)
- [x] NC added via ADR-003 (2026-01-01)

### Constraint Modification Rules

- [x] No constraints modified without ADR authorization
- [x] Post-run formalization permitted within 24h
- [x] All constraint changes documented in CL_ERD.md

---

## Identity Funnel (ADR-004)

### Funnel Architecture

- [x] 5-pass funnel implemented (existence, name, domain, collision, firmographic)
- [x] Cost-first, accuracy-second approach
- [x] All passes deterministic ($0 cost)
- [x] LLM usage feature-flagged and disabled by default
- [x] Unified error table with pass discriminator

### Funnel Passes

- [x] Pass 1: Existence Verification (domain resolution)
- [x] Pass 2: Name Canonicalization (regex-based normalization)
- [x] Pass 3: Domain-Name Coherence (token matching)
- [x] Pass 4: Collision Detection (deterministic resolution)
- [x] Pass 5: Firmographic Coherence (validation only, no enrichment)

### Confidence Envelope

- [x] `cl.identity_confidence` table created
- [x] Scoring formula documented in CL_PASS_CONTRACTS.md
- [x] Buckets defined: HIGH (70+), MEDIUM (40-69), LOW (20-39), UNVERIFIED (0-19)
- [x] Recomputation script: `recompute-confidence.js`

### Funnel Scripts

- [x] `existence-verification-worker.js` implemented
- [x] `pass-2-name-canonicalization.js` implemented
- [x] `pass-3-domain-coherence.js` implemented
- [x] `pass-4-collision-detection.js` implemented
- [x] `pass-5-firmographic-coherence.js` implemented
- [x] `recompute-confidence.js` implemented

### Kill Switches

- [x] Error rate kill switch: >50% triggers pause
- [x] LLM usage gate: >5% disables LLM, continues deterministic
- [x] Timeout threshold: >30s/record avg triggers pause

### Documentation

- [x] Pass contracts documented: `docs/CL_PASS_CONTRACTS.md`
- [x] Funnel report generated: `docs/CL_FUNNEL_REPORT.md`
- [x] ADR-004 created and accepted

---

## Four-Hub Architecture (ADR-005)

### Hub Structure

- [x] Hub 1: company_cl (Sovereign Identity) - This repo
- [x] Hub 2: outreach (Engagement) - Outreach repo
- [x] Hub 3: sales (Pipeline) - Lovable vault
- [x] Hub 4: client (Customers) - Lovable vault

### Schema Migration

- [x] Single table approach for company_identity
- [x] Status sync: existence_verified → identity_status
- [x] Error data migrated to unified cl_errors
- [x] Bloat tables dropped (v1 error tables, staging)
- [x] Eligibility view: v_company_identity_eligible
- [x] Summary view: v_identity_gate_summary

### Gate Enforcement

- [x] CL → Outreach gate: identity_status = 'PASS'
- [x] Database trigger on outreach.outreach (outreach repo)
- [x] Agent pre-check before promotion

### Data Preserved

- [x] 71,823 company_identity records
- [x] 63,911 PASS status (88.98%)
- [x] 7,912 FAIL status
- [x] 59,812 company_candidate (audit log)
- [x] Error records migrated (7,985 + legacy)

---

## Neon Agent

### Agent Commands

- [x] `neon-agent migrate` - Schema migrations
- [x] `neon-agent audit` - Data quality checks
- [x] `neon-agent gate` - Gate eligibility
- [x] `neon-agent promote` - Stage promotions
- [x] `neon-agent health` - System health
- [x] `neon-agent sync` - Status sync

### Agent Doctrine

- [x] Agent enforces structure and movement
- [x] Agent does not invent business logic
- [x] Agent does not guess intent
- [x] Agent does not rewrite identity
- [x] Agent does not run enrichment

### Agent Documentation

- [x] PRD: docs/prd/PRD-NEON-AGENT.md
- [x] ADR: docs/adr/ADR-005-four-hub-architecture.md
- [x] Migration Guide: docs/OUTREACH_MIGRATION_GUIDE.md

---

## Multi-State Intake Doctrine Lock (ADR-006)

### StateCsvSourceAdapter Base Class

- [x] Base class created: `pipeline/adapters/state_csv_adapter.js`
- [x] All adapters must extend `StateCsvSourceAdapter`
- [x] Constructor enforces `state_code` declaration
- [x] Constructor enforces `source_system` declaration
- [x] Adapter registry prevents duplicate state_code
- [x] Adapter registry prevents duplicate source_system

### CSV Contract (Global)

- [x] `Name` field required
- [x] `Domain OR LinkedIn URL` required (at least one)
- [x] Admission gate: `domain IS NOT NULL OR linkedin IS NOT NULL`
- [x] Optional fields go to raw_payload only
- [x] Identity is NEVER inferred from optional fields

### Identity Field Allowlist

- [x] Allowlist defined: `company_name, company_domain, linkedin_url`
- [x] Allowlist is frozen (`Object.freeze`)
- [x] No fields may be added without ADR

### Compile-Time Guards

- [x] `assertAdapterInheritance()` guard implemented
- [x] `assertIdentityFieldAllowlist()` guard implemented
- [x] Guards execute at module load time
- [x] Guards fail with `process.exit(1)` on violation

### Registered Adapters

- [x] NC: `NCExcelSourceAdapter` (SS-001) - Active
- [x] DE: `DECsvSourceAdapter` (SS-002) - Active

### State Handling

- [x] `state_code` injected by adapter (never parsed from CSV)
- [x] State-specific logic isolated to adapters only
- [x] No state parsing from Location field

### Documentation

- [x] ADR-006 created and accepted
- [x] PRD-MULTI-STATE-INTAKE.md created
- [x] COMPANY_LIFECYCLE_LOCK.md created
- [x] GATE_ZERO_INTAKE.md updated (OR logic)

---

## Compliance Status

**Current Status:** COMPLIANT

**Blockers:** None

**Doctrine Version:** 1.4

---

## Compliance Rule

If any box is unchecked, this hub may not ship.

---

## Approval

| Role | Name | Date |
|------|------|------|
| Hub Owner | SHQ | 2025-12-30 |
| Compliance Officer | | |
