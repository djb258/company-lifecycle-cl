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

## 6. IMO Structure

This hub owns all three IMO layers internally.
Spokes and sub-hubs are **external execution surfaces only**.

| Layer           | Role            | Description                                                   |
| --------------- | --------------- | ------------------------------------------------------------- |
| **I — Ingress** | Event intake    | Receives verified lifecycle events (no logic)                 |
| **M — Middle**  | Authority logic | Lifecycle state evaluation, promotion rules, sub-hub issuance |
| **O — Egress**  | State emission  | Emits lifecycle state changes and active sub-hub pointers     |

---

## 7. Spokes

Spokes are **interfaces only**. They carry no logic or state.

| Spoke Name   | Type | Direction | Contract                                  |
| ------------ | ---- | --------- | ----------------------------------------- |
| Outreach App | I    | Inbound   | Outreach events (activation, meeting set) |
| Sales App    | I    | Inbound   | Sales outcome events                      |
| Client App   | I    | Inbound   | Client activation confirmation            |
| Reporting    | O    | Outbound  | Read-only lifecycle state                 |
| UI Shell     | O    | Outbound  | Read-only lifecycle view                  |

---

## 8. Connectors

| Connector        | Type  | Direction | Contract                    |
| ---------------- | ----- | --------- | --------------------------- |
| Lifecycle Events | Event | Inbound   | Verified event payload      |
| Lifecycle State  | API   | Outbound  | Read-only CL state          |
| Audit Log        | Event | Outbound  | Immutable lifecycle history |

---

## 9. Tools

All tools are scoped **only to this hub's M layer**.

| Tool              | Doctrine ID  | Scoped To    | ADR     |
| ----------------- | ------------ | ------------ | ------- |
| Neon (Primary DB) | DB-NEON-01   | CL (M layer) | ADR-001 |
| Event Validator   | EVT-VALID-01 | CL (M layer) | ADR-001 |

---

## 10. Guard Rails

| Guard Rail                 | Type       | Threshold |
| -------------------------- | ---------- | --------- |
| Duplicate Company Creation | Validation | Reject    |
| Multiple Active Sub-Hubs   | Validation | Reject    |
| Invalid Promotion Order    | Validation | Reject    |
| Unauthorized Promotion     | Validation | Reject    |

---

## 11. Kill Switch

* **Endpoint:** `/cl/kill-switch`
* **Activation Criteria:** Invalid lifecycle mutation detected
* **Emergency Contact:** SHQ / Barton Ops

---

## 12. Promotion Gates

| Gate | Artifact     | Requirement                           |
| ---- | ------------ | ------------------------------------- |
| G1   | PRD          | Hub definition approved               |
| G2   | ADR          | Lifecycle authority decision recorded |
| G3   | Linear Issue | Work item created and assigned        |
| G4   | PR           | Code reviewed and merged              |
| G5   | Checklist    | Deployment verification complete      |

---

## 13. Failure Modes

| Failure                      | Severity | Remediation               |
| ---------------------------- | -------- | ------------------------- |
| Duplicate company identities | High     | Manual merge + audit      |
| Incorrect promotion          | High     | Rollback + investigation  |
| Missing event                | Medium   | Re-ingest verified source |
| Stale lifecycle state        | Medium   | Reconcile from audit log  |

---

## 14. Human Override Rules

Human override is permitted **only** to:

* Correct identity conflicts
* Resolve audit discrepancies

All overrides require:

* Named approver
* Timestamp
* Audit trail entry

---

## 15. Observability

* **Logs:** Immutable audit log of all lifecycle state changes
* **Metrics:** Promotion counts, sub-hub activation rates, rejection rates
* **Alerts:** Invalid mutation attempts, duplicate identity detection

---

## Approval

| Role     | Name | Date |
| -------- | ---- | ---- |
| Owner    |      |      |
| Reviewer |      |      |
