# PRD — Hub

## 1. Overview

* **System Name:** Company Lifecycle (CL)
* **Hub Name:** Company Lifecycle Hub
* **Owner:** Barton / Supreme Headquarters (SHQ)
* **Version:** v1.0

---

## 2. Hub Identity

| Field          | Value      |
| -------------- | ---------- |
| **Hub ID**     | HUB-CL-001 |
| **Process ID** | CL-CORE    |

---

## 3. Purpose

The Company Lifecycle (CL) hub is the **sovereign authority** for company identity and lifecycle state.

CL owns:

* Company identity (`company_uid`)
* Lifecycle truth (`cl_stage`)
* Authority to mint and activate sub-hub applications
* Authority to promote lifecycle state based on verified events

CL does **not** execute operational work.
CL determines *reality*, not activity.

All lifecycle decisions are centralized in CL to prevent identity drift, state ambiguity, and cross-hub conflicts.

---

## 4. CTB Placement

| CTB Path | Branch Level | Parent Hub |
|----------|--------------|------------|
| sys/company-lifecycle | sys | None (Root Hub) |

---

## 5. Altitude Scope

| Level     | Description                              | Selected |
| --------- | ---------------------------------------- | -------- |
| 30,000 ft | Strategic vision, system-wide boundaries | [x]      |
| 20,000 ft | Domain architecture, hub relationships   | [x]      |
| 10,000 ft | Component design, interface contracts    | [ ]      |
| 5,000 ft  | Implementation detail, execution logic   | [ ]      |

---

## 6. Canonical Data Flow

### Flow Diagram

```
Source Company Tables (READ-ONLY)
        │
        │ COPY (never move)
        ▼
CL Identity Staging (cl.company_lifecycle_identity_staging)
        │
        ├── ELIGIBLE ──► CL Sovereign Identity (cl.company_identity)
        │                         │
        │                         ▼
        │                 CL Bridge (cl.company_identity_bridge)
        │                         │
        │                         ▼
        │                 Downstream Consumers
        │
        └── INELIGIBLE ──► CL Error (cl.company_lifecycle_error)
                                  │
                                  └── REPAIR → RE-ENTRY
```

### Flow Rules

| Rule | Description |
|------|-------------|
| COPY-NEVER-MOVE | Data copied from source, never moved |
| READ-ONLY-SOURCE | Source tables never mutated |
| ONE-WAY-FLOW | source → staging → identity → bridge → consumers |
| NO-BACKWARD-WRITES | CL never writes to source |
| ERROR-REPAIR-REENTRY | Errors re-enter at same stage |
| IDEMPOTENT-MINTING | Fingerprint prevents duplicates |
| BRIDGE-ONLY-JOIN | Consumers join only through bridge |

---

## 7. IMO Structure

This hub owns all three IMO layers internally.
Spokes and sub-hubs are **external execution surfaces only**.

| Layer           | Role            | Description                                                   |
| --------------- | --------------- | ------------------------------------------------------------- |
| **I — Ingress** | Event intake    | Receives verified lifecycle events (no logic)                 |
| **M — Middle**  | Authority logic | Lifecycle state evaluation, promotion rules, sub-hub issuance |
| **O — Egress**  | State emission  | Emits lifecycle state changes and active sub-hub pointers     |

---

## 8. Spokes

Spokes are **interfaces only**. They carry no logic or state.

| Spoke Name   | Type | Direction | Contract                                  |
| ------------ | ---- | --------- | ----------------------------------------- |
| Outreach App | I    | Inbound   | Outreach events (activation, meeting set) |
| Sales App    | I    | Inbound   | Sales outcome events                      |
| Client App   | I    | Inbound   | Client activation confirmation            |
| Reporting    | O    | Outbound  | Read-only lifecycle state                 |
| UI Shell     | O    | Outbound  | Read-only lifecycle view                  |

---

## 9. Connectors

| Connector        | Type  | Direction | Contract                    |
| ---------------- | ----- | --------- | --------------------------- |
| Lifecycle Events | Event | Inbound   | Verified event payload      |
| Lifecycle State  | API   | Outbound  | Read-only CL state          |
| Audit Log        | Event | Outbound  | Immutable lifecycle history |

---

## 10. Tools

All tools are scoped **only to this hub's M layer**.

| Tool              | Doctrine ID  | Scoped To    | ADR     |
| ----------------- | ------------ | ------------ | ------- |
| Neon (Primary DB) | DB-NEON-01   | CL (M layer) | ADR-001 |
| Event Validator   | EVT-VALID-01 | CL (M layer) | ADR-001 |

---

## 11. Guard Rails

| Guard Rail                 | Type       | Threshold |
| -------------------------- | ---------- | --------- |
| Duplicate Company Creation | Validation | Reject    |
| Multiple Active Sub-Hubs   | Validation | Reject    |
| Invalid Promotion Order    | Validation | Reject    |
| Unauthorized Promotion     | Validation | Reject    |

---

## 12. Kill Switch

* **Endpoint:** `/cl/kill-switch`
* **Activation Criteria:** Invalid lifecycle mutation detected
* **Emergency Contact:** SHQ / Barton Ops

---

## 13. Promotion Gates

| Gate | Artifact     | Requirement                           |
| ---- | ------------ | ------------------------------------- |
| G1   | PRD          | Hub definition approved               |
| G2   | ADR          | Lifecycle authority decision recorded |
| G3   | Linear Issue | Work item created and assigned        |
| G4   | PR           | Code reviewed and merged              |
| G5   | Checklist    | Deployment verification complete      |

---

## 14. Failure Modes

| Failure                      | Severity | Remediation               |
| ---------------------------- | -------- | ------------------------- |
| Duplicate company identities | High     | Manual merge + audit      |
| Incorrect promotion          | High     | Rollback + investigation  |
| Missing event                | Medium   | Re-ingest verified source |
| Stale lifecycle state        | Medium   | Reconcile from audit log  |

---

## 15. Human Override Rules

Human override is permitted **only** to:

* Correct identity conflicts
* Resolve audit discrepancies

All overrides require:

* Named approver
* Timestamp
* Audit trail entry

---

## 16. Observability

* **Logs:** Immutable audit log of all lifecycle state changes
* **Metrics:** Promotion counts, sub-hub activation rates, rejection rates
* **Alerts:** Invalid mutation attempts, duplicate identity detection

---

## 17. Handoff: CL → Company Target (CT)

### Handoff Overview

When CL mints a new `company_uid` or promotes a company to a new lifecycle stage, it **hands off** to the **Company Target (CT)** hub for targeting and segmentation.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CL → CT HANDOFF FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────┐                    ┌─────────────────────┐
    │   COMPANY LIFECYCLE │                    │   COMPANY TARGET    │
    │        (CL)         │                    │        (CT)         │
    │                     │                    │                     │
    │  • Mints identity   │ ──────────────────►│  • Receives identity│
    │  • Promotes stage   │  IDENTITY_MINTED   │  • Qualifies target │
    │  • Retires identity │  STAGE_PROMOTED    │  • Segments company │
    │                     │  IDENTITY_RETIRED  │  • Routes to hubs   │
    └─────────────────────┘                    └─────────────────────┘
```

### Handoff Events

| Event | Trigger | Payload | CT Action |
|-------|---------|---------|-----------|
| `IDENTITY_MINTED` | New company created | `company_uid`, `legal_name`, `cl_stage` | Initialize target record |
| `STAGE_PROMOTED` | Company promoted to new stage | `company_uid`, `old_stage`, `new_stage`, `promoted_at` | Update targeting rules |
| `IDENTITY_RETIRED` | Company retired | `company_uid`, `retired_at`, `reason` | Deactivate targeting |

### Handoff Contract (CL → CT)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `company_uid` | UUID | **YES** | Sovereign identifier from CL |
| `legal_name` | string | YES | Canonical company name |
| `cl_stage` | enum | YES | `OUTREACH` / `SALES` / `CLIENT` |
| `event_type` | enum | YES | `IDENTITY_MINTED` / `STAGE_PROMOTED` / `IDENTITY_RETIRED` |
| `event_timestamp` | datetime | YES | When event occurred |
| `correlation_id` | UUID | YES | Trace ID for audit |

### Handoff Rules (DOCTRINE)

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                       CL → CT HANDOFF DOCTRINE                                ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   1. CL INITIATES, CT RECEIVES                                               ║
║      CL pushes events to CT. CT never pulls from CL.                         ║
║                                                                               ║
║   2. IDENTITY IS READ-ONLY FOR CT                                            ║
║      CT may enrich targeting data but CANNOT modify company_uid,             ║
║      legal_name, or cl_stage. Only CL owns these fields.                     ║
║                                                                               ║
║   3. EVERY HANDOFF MUST BE ACKNOWLEDGED                                      ║
║      CT must emit CT_HANDOFF_ACK or CT_HANDOFF_NACK within 30 seconds.      ║
║                                                                               ║
║   4. FAILED HANDOFFS QUEUE FOR RETRY                                         ║
║      If CT is unavailable, CL queues events in cl.handoff_queue.            ║
║                                                                               ║
║   5. AUDIT TRAIL IS MANDATORY                                                ║
║      All handoff events logged to cl.audit_trail with correlation_id.       ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Related Documents

| Document | Purpose |
|----------|---------|
| [[PRD_COMPANY_TARGET]] | Full CT hub specification |
| [[ADR-002-CL-CT-Handoff]] | Architecture decision for handoff protocol |

---

## 18. Identity Gate (Downstream Eligibility)

### Gate Overview

The Identity Gate controls which companies are **eligible for downstream consumption** (Outreach, Company Target, etc.).

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    IDENTITY GATE DOCTRINE                                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   ELIGIBILITY CONTRACT:                                                       ║
║   eligible_for_outreach = (identity_pass >= 1 AND identity_status = 'PASS')  ║
║                                                                               ║
║   CRITICAL: existence_verified is INFORMATIONAL ONLY.                        ║
║   It MUST NOT unlock downstream pipelines.                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Gate Implementation (BEHAVIOR-ONLY)

| Principle | Description |
|-----------|-------------|
| **BEHAVIOR-ONLY** | Gate is a VIEW + code logic. No data mutation. |
| **NON-DESTRUCTIVE** | No bulk updates to cl.company_identity rows. |
| **ADDITIVE-ONLY** | All changes are new VIEWs, tables, or code. |
| **INSTANT-ROLLBACK** | Drop VIEW + set `ENFORCE_IDENTITY_GATE=false` reverts behavior. |

### Gate Components

| Component | Type | Purpose |
|-----------|------|---------|
| `cl.v_company_identity_eligible` | VIEW | Computes eligibility from raw data |
| `cl.identity_gate_audit` | TABLE | Logs gate check summaries per run |
| `cl.identity_gate_failures` | TABLE | Logs records that failed gate downstream |
| `ENFORCE_IDENTITY_GATE` | ENV VAR | Kill switch (default: true) |

### Eligibility Reasons

| Reason | Meaning |
|--------|---------|
| `PASS` | Eligible for outreach |
| `PENDING` | Identity pass not yet complete |
| `FAIL_STATE` | State coherence failed (contradiction) |
| `FAIL_NAME` | Name coherence below threshold |
| `FAIL_DOMAIN` | Domain verification failed |
| `UNKNOWN` | Unclassified failure |

### Out of Scope

The Identity Gate rollout does **NOT** include:

- Re-running existence verification
- Bulk updating cl.company_identity rows
- Modifying upstream CL data
- Any data mutation

These are **upstream CL operations** and are explicitly out of scope for the gate rollout.

---

## Approval

| Role     | Name | Date |
| -------- | ---- | ---- |
| Owner    |      |      |
| Reviewer |      |      |
