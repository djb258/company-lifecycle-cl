# ADR: CL as Sovereign Lifecycle Authority

## ADR Identity

| Field      | Value      |
| ---------- | ---------- |
| **ADR ID** | ADR-001    |
| **Status** | [x] Accepted |
| **Date**   | 2025-12-24 |

---

## Owning Hub

| Field        | Value                 |
| ------------ | --------------------- |
| **Hub Name** | Company Lifecycle Hub |
| **Hub ID**   | HUB-CL-001            |

---

## Scope

| Layer       | Affected |
| ----------- | -------- |
| I — Ingress | [x]      |
| M — Middle  | [x]      |
| O — Egress  | [x]      |

---

## Context

The system manages companies across multiple lifecycle phases (Outreach, Sales, Client) implemented as independent applications.
Without a single authority, identity drift, ambiguous state, and conflicting promotions emerge.
A decision is required to establish **where lifecycle truth lives** and **who is allowed to declare reality** before execution begins.

---

## Decision

**Company Lifecycle (CL) is designated as the sole sovereign authority for company identity and lifecycle state.**

CL is the only hub permitted to:

* Mint `company_uid`
* Mint and activate sub-hub IDs
* Promote lifecycle state based on verified events

Sub-hubs emit **facts**, not **truth**.
Lifecycle reality is centralized to ensure determinism, auditability, and non-ambiguous state.

---

## Alternatives Considered

| Option                | Why Not Chosen                                  |
| --------------------- | ----------------------------------------------- |
| Sub-hubs self-promote | Leads to conflicting states and authority drift |
| CRM-centric lifecycle | Tool-coupled identity; poor auditability        |
| Status-only flags     | No authority, no event provenance               |
| Do Nothing            | Guarantees inconsistency at scale               |

---

## Consequences

### Enables

* Single source of truth for lifecycle
* Clean audit trail of promotions
* Independent sub-hub execution
* Deterministic UI and reporting

### Prevents

* Duplicate or competing lifecycle states
* Sideways promotion logic
* Tool-driven identity drift
* Implicit or inferred lifecycle changes

---

## Guard Rails

| Type        | Value                            |
| ----------- | -------------------------------- |
| Rate Limit  | One active lifecycle per company |
| Timeout     | N/A (event-driven)               |
| Kill Switch | CL promotion suspension endpoint |

---

## Rollback

If this decision proves invalid, rollback requires:

* Freezing promotions in CL
* Reverting lifecycle authority to a previous ADR-defined model
* Manual reconciliation of lifecycle state

Rollback **does not** preserve partial authority or hybrid models.

---

## Traceability

| Artifact     | Reference                              |
| ------------ | -------------------------------------- |
| PRD          | docs/prd/PRD_COMPANY_LIFECYCLE.md      |
| Sub-PRD      | N/A (Root Hub)                         |
| Linear Issue | CL-001                                 |
| PR(s)        | Initial schema migration               |

---

## Approval

| Role      | Name | Date       |
| --------- | ---- | ---------- |
| Hub Owner | SHQ  | 2025-12-30 |
| Reviewer  |      |            |
