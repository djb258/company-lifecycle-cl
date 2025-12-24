# Company Lifecycle (CL) Doctrine

**(Sovereign Hub Definition)**

This document defines the **Company Lifecycle (CL)** hub as a concrete implementation of the
**Hub & Spoke Architecture Doctrine (CTB + IMO + Altitude)**.

If any conflict exists, the **Hub & Spoke Architecture Doctrine** remains authoritative.
This document **specializes**, it does not override.

> **Parent Doctrine:** [Hub & Spoke Architecture Doctrine](../../templates/doctrine/HUB_SPOKE_ARCHITECTURE.md)

---

## 1. CL Hub Declaration (Non-Negotiable)

* **CL is a Hub**
* **CL is the sovereign hub for company identity and lifecycle truth**
* There is **exactly one CL hub per company universe**
* CL is the **parent authority** of all lifecycle sub-hubs

CL is not a workflow engine.
CL is not a CRM.
CL is not an execution surface.

CL is an **authority hub**.

---

## 2. What CL Owns (Exhaustive)

CL owns **and only owns**:

* `company_uid` (sovereign, immutable)
* Legal / canonical company name
* `cl_stage` (lifecycle truth)
* Active sub-hub pointers:

  * `outreach_uid`
  * `sales_uid`
  * `client_uid`
* Lifecycle timestamps
* Entry source metadata
* Immutable audit trail of lifecycle events

If a field is not listed above, **it does not belong in CL**.

---

## 3. What CL Explicitly Does NOT Own

CL MUST NOT contain:

* Meetings
* Outreach touches
* Sales pipeline data
* Quotes or pricing
* Enrollment data
* People or roles
* Documents
* Tasks or workflows
* UI state
* Tool-specific identifiers

CL never executes work.
CL never infers intent.
CL never "progresses" state without an event.

---

## 4. CL Authority Rules (Hard Law)

Only CL may:

* Mint a `company_uid`
* Mint sub-hub IDs
* Activate sub-hubs
* Promote lifecycle state
* Declare lifecycle reality

Sub-hubs **may emit facts**.
Sub-hubs **may not declare truth**.

> **Facts come in. Reality goes out.**

---

## 5. Sub-Hub Relationship Model

Outreach, Sales, and Client are:

* **Independent applications**
* **Child hubs** of CL
* Scoped to execution only
* Always keyed to `company_uid`

Sub-hubs:

* May exist or not exist independently
* May be skipped entirely
* May be re-created over time
* May never outlive CL

A sub-hub **cannot exist without CL**.
CL can exist with **zero sub-hubs**.

---

## 6. Promotion Doctrine (Event-Driven Only)

Lifecycle promotion is **event-driven**, not status-driven.

### Valid Promotions

* **Outreach → Sales**
  Trigger: *Meeting Set* (verified event)
* **Sales → Client**
  Trigger: *Agreement Signed / Go-Live*

No other promotions are allowed.

Manual status changes are prohibited.
Automation inference is prohibited.

All promotions:

* Are logged
* Are auditable
* Are reversible only via human override

---

## 7. IMO Application to CL

CL implements full IMO **internally**.

### Ingress (I)

* Receives verified lifecycle events
* Validates schema only
* No decisions
* No state mutation

### Middle (M)

* Evaluates lifecycle rules
* Validates promotion eligibility
* Issues sub-hub IDs
* Updates lifecycle truth

### Egress (O)

* Emits lifecycle state
* Emits active sub-hub pointers
* Emits audit events
* Read-only outputs only

---

## 8. CTB Placement (Locked)

| Element | Value               |
| ------- | ------------------- |
| Trunk   | `sys/`              |
| Branch  | `company-lifecycle` |
| Leaf    | `cl`                |

CL is a **root domain hub**.
It has no parent hub.

---

## 9. Altitude Lock

CL operates only at:

* **30k** — System lifecycle authority
* **20k** — Domain architecture and hub relationships

CL MUST NOT descend to:

* 10k (process logic)
* 5k (execution details)

Those altitudes belong to sub-hubs.

---

## 10. Hard Violations (Immediate Stop)

The following are **stop-the-line violations**:

* Sub-hub promoting lifecycle state
* CL storing operational data
* Multiple active lifecycle stages
* Duplicate `company_uid`
* Automation minting sub-hub IDs
* UI mutating lifecycle truth
* Lifecycle logic outside CL

These are **schema violations**, not implementation bugs.

---

## 11. Design Twins (Reference Only)

* **Miro** = design twin (visual PRD)
* **Linear** = execution twin (task control)

Neither replaces doctrine.

---

## Final Rule

> **CL is the sovereign authority for company identity and lifecycle truth.**
> **All other hubs serve CL. CL serves no other hub.**
> **This doctrine is frozen.**
