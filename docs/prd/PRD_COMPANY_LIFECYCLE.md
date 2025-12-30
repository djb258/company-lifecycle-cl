# PRD — Company Lifecycle (CL) Hub

## 1. Overview

- **System Name:** Company Lifecycle
- **Hub Name:** CL (Company Lifecycle)
- **Owner:** Supreme Headquarters (SHQ)
- **Version:** 1.0

---

## 2. Hub Identity

| Field | Value |
|-------|-------|
| **Hub ID** | HUB-CL-001 |
| **Process ID** | CL-PROC-001 |

---

## 3. Purpose

The Company Lifecycle (CL) hub is the **constitutional root** for company identity across the entire organizational ecosystem. CL is the **sovereign authority** that:

- **Mints** the `company_unique_id` — the single source of truth for company identity
- **Promotes** companies through lifecycle stages: OUTREACH → SALES → CLIENT
- **Governs** all child sub-hubs by activating them only after promotion gates are satisfied
- **Retires** company identities when necessary

CL owns identity. All other hubs are children that consume identity from CL.

---

## 4. CTB Placement

| CTB Path | Branch Level | Parent Hub |
|----------|--------------|------------|
| sys/company-lifecycle | sys | None (Root Hub) |

---

## 5. Altitude Scope

| Level | Description | Selected |
|-------|-------------|----------|
| 30,000 ft | Strategic vision, system-wide boundaries | [x] |
| 20,000 ft | Domain architecture, hub relationships | [x] |
| 10,000 ft | Component design, interface contracts | [ ] |
| 5,000 ft | Implementation detail, execution logic | [ ] |

CL operates at 30,000–20,000 ft altitude. It defines **what** identity is and **when** promotions occur, not **how** downstream systems execute.

---

## 6. IMO Structure

| Layer | Role | Description |
|-------|------|-------------|
| **I — Ingress** | Dumb input only | Receives company candidates from external sources (Clay, scrapers, imports). No logic. |
| **M — Middle** | Logic, decisions, state | Identity minting, deduplication, lifecycle state machine, promotion logic |
| **O — Egress** | Output only | Emits `company_unique_id` and lifecycle state to child hubs. No logic. |

---

## 7. Spokes

| Spoke Name | Type | Direction | Contract |
|------------|------|-----------|----------|
| cl-identity-egress | O | Outbound | Provides `company_unique_id` to child hubs |
| cl-candidate-ingress | I | Inbound | Receives company candidates for identity resolution |
| cl-promotion-egress | O | Outbound | Emits promotion events to activate child hubs |

---

## 8. Connectors

| Connector | Type | Direction | Contract |
|-----------|------|-----------|----------|
| Neon PostgreSQL | API | Bidirectional | cl.company_identity, cl.lifecycle_state tables |
| Outreach Hub | Event | Outbound | Activation on OUTREACH stage |
| Sales Hub | Event | Outbound | Activation on SALES stage |
| Client Hub | Event | Outbound | Activation on CLIENT stage |

---

## 9. Tools

| Tool | Doctrine ID | Scoped To | ADR |
|------|-------------|-----------|-----|
| Identity Minter | CL-TOOL-001 | M Layer | ADR-001 |
| Deduplication Engine | CL-TOOL-002 | M Layer | ADR-001 |
| Lifecycle State Machine | CL-TOOL-003 | M Layer | ADR-001 |
| Promotion Gate Validator | CL-TOOL-004 | M Layer | ADR-001 |

---

## 10. Guard Rails

| Guard Rail | Type | Threshold |
|------------|------|-----------|
| Identity Uniqueness | Validation | No duplicate `company_unique_id` |
| Immutable Identity | Validation | `company_unique_id` cannot be modified after mint |
| Promotion Gate | Validation | Stage transitions require gate satisfaction |
| Audit Trail | Validation | All state changes must be logged |

---

## 11. Kill Switch

- **Endpoint:** `POST /api/cl/kill-switch`
- **Activation Criteria:**
  - Duplicate identity detected
  - Unauthorized promotion attempt
  - Data integrity violation
- **Emergency Contact:** SHQ Admin

---

## 12. Promotion Gates

| Gate | Artifact | Requirement |
|------|----------|-------------|
| G1 | PRD | This document approved |
| G2 | ADR | ADR-001 Lifecycle State Machine accepted |
| G3 | Linear Issue | CL-001 work item created |
| G4 | PR | Schema migrations reviewed and merged |
| G5 | Checklist | All compliance items verified |

---

## 13. Failure Modes

| Failure | Severity | Remediation |
|---------|----------|-------------|
| Duplicate identity mint attempt | CRITICAL | Reject mint, log violation, alert SHQ |
| Invalid promotion (missing gate) | HIGH | Block promotion, return gate requirements |
| External ID collision | MEDIUM | Queue for manual resolution |
| Database connection failure | HIGH | Retry with backoff, fail-safe to read-only |

---

## 14. Human Override Rules

| Override | Approver | Condition |
|----------|----------|-----------|
| Force promotion | SHQ Admin | Documented business exception |
| Identity merge | SHQ Admin | Verified duplicate with audit trail |
| Identity retirement | SHQ Admin | Legal/compliance requirement |

---

## 15. Observability

- **Logs:** All identity mints, promotions, and state changes logged to `cl.audit_trail`
- **Metrics:**
  - Identities minted per day
  - Promotions per stage per day
  - Gate satisfaction rate
- **Alerts:**
  - Duplicate mint attempt
  - Promotion gate failure
  - Kill switch activation

---

## What CL Owns (Exhaustive)

| Attribute | Description |
|-----------|-------------|
| `company_unique_id` | Sovereign, immutable identifier (UUID) |
| `legal_name` | Canonical company name |
| `cl_stage` | Current lifecycle truth (OUTREACH / SALES / CLIENT) |
| `outreach_uid` | Pointer to active Outreach sub-hub record |
| `sales_uid` | Pointer to active Sales sub-hub record |
| `client_uid` | Pointer to active Client sub-hub record |
| `created_at` | Identity mint timestamp |
| `promoted_at` | Last promotion timestamp |
| `retired_at` | Retirement timestamp (if applicable) |
| `audit_trail` | Immutable history of all transitions |

**If a field is not listed above, it does not belong in CL.**

---

## Explicit Non-Goals

| CL Does NOT | Belongs To |
|-------------|------------|
| Execute outreach sequences | Outreach Hub |
| Manage sales pipelines | Sales Hub |
| Track client relationships | Client Hub |
| Store people or contacts | People Intelligence Hub |
| Perform data enrichment | Enrichment systems |
| Provide user interfaces | Application layer |

---

## Approval

| Role | Name | Date |
|------|------|------|
| Owner | SHQ | 2025-12-30 |
| Reviewer | | |
