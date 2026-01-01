# Company Lifecycle (CL) Doctrine

**Sovereign Hub Definition — Doctrine Locked**

---

## Preamble

This document defines the **Company Lifecycle (CL)** hub as the **constitutional root** for company identity across the entire organizational ecosystem.

CL is not a workflow engine. CL is not a CRM. CL is not an execution surface.

**CL is a sovereign authority hub.**

This doctrine is **frozen**. Modifications require formal governance review.

---

## 1. Canonical Data Flow

### 1.1 Flow Diagram

```
Source Company Tables (READ-ONLY)
        │
        │ COPY (never move)
        ▼
CL Identity Staging
        │
        ├── ELIGIBLE ──────► CL Sovereign Identity (company_sov_id)
        │                            │
        │                            ▼
        │                    CL Bridge Mapping (source ↔ sovereign)
        │                            │
        │                            ▼
        │                    Downstream Consumers
        │
        └── INELIGIBLE ────► CL Error Table
                                     │
                                     └── REPAIR → RE-ENTRY (same stage)
```

### 1.2 Flow Rules (Invariants)

| Rule | Description |
|------|-------------|
| **COPY-NEVER-MOVE** | Data is copied from source to staging, never moved |
| **READ-ONLY-SOURCE** | Source tables are never mutated by CL |
| **ONE-WAY-FLOW** | Data flows: source → staging → identity → bridge → consumers |
| **NO-BACKWARD-WRITES** | CL never writes back to source tables |
| **ERROR-REPAIR-REENTRY** | Errors route to error table; repair re-enters same stage |
| **IDEMPOTENT-MINTING** | Fingerprint ensures one sovereign ID per unique company |
| **BRIDGE-ONLY-JOIN** | Consumers join only through bridge table |

### 1.3 Tables in Flow

| Table | Purpose |
|-------|---------|
| `cl.company_lifecycle_identity_staging` | Pre-sovereign intake staging |
| `cl.company_identity` | Sovereign identity (company_sov_id) |
| `cl.company_identity_bridge` | Source ↔ Sovereign mapping |
| `cl.company_lifecycle_error` | Error routing and repair |

---

## 2. Constitutional Authority

### 2.1 Sovereign Declaration

CL is the **only system** authorized to:

- **Mint** a `company_unique_id`
- **Merge** company identities
- **Retire** company identities
- **Promote** lifecycle state
- **Activate** child sub-hubs

No other system, hub, application, integration, or automation holds this authority.

### 2.2 Identity Immutability

Once a `company_unique_id` is minted:

- It **cannot** be changed
- It **cannot** be reassigned
- It **cannot** be reused after retirement
- It **remains** the permanent anchor for all related data

### 2.3 Single Source of Truth

There is **exactly one** CL hub per organizational universe.

All systems must resolve company identity through CL. There are no alternatives, fallbacks, or exceptions.

---

## 3. Parent / Child Hub Topology

### 2.1 Hierarchy Declaration

```
                    ┌─────────────────────────────┐
                    │     COMPANY LIFECYCLE       │
                    │         (CL)                │
                    │      PARENT HUB             │
                    │      HUB-CL-001             │
                    └─────────────┬───────────────┘
                                  │
           ┌──────────────────────┼──────────────────────┐
           │                      │                      │
           ▼                      ▼                      ▼
    ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
    │  OUTREACH   │       │    SALES    │       │   CLIENT    │
    │  Sub-Hub    │       │   Sub-Hub   │       │   Sub-Hub   │
    └─────────────┘       └─────────────┘       └─────────────┘
           │                      │                      │
           └──────────────────────┴──────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │    DOWNSTREAM CONSUMERS   │
                    ├───────────────────────────┤
                    │ • Shenandoah Valley Group │
                    │ • Weewee.me               │
                    │ • People Intelligence     │
                    │ • DOL Filings             │
                    │ • All future systems      │
                    └───────────────────────────┘
```

### 2.2 Parent Hub (CL)

CL is the **parent**. CL:

- Owns company identity
- Governs lifecycle state
- Controls sub-hub activation
- Maintains audit history
- Has no parent hub above it

### 2.3 Child Sub-Hubs

Outreach, Sales, and Client are **children**. They:

- **Attach only** via `company_unique_id`
- **Cannot exist** without an upstream CL record
- **Cannot promote** themselves or other hubs
- **Cannot mint** company identities
- **Execute work** within their domain only

### 2.4 Downstream Consumers

Systems like Shenandoah Valley Group, Weewee.me, and others are **consumers**. They:

- Reference company identity via `company_unique_id`
- Have **read-only** relationship with CL
- Cannot modify lifecycle state
- Cannot create company records
- Must accept CL as authoritative

---

## 4. Lifecycle State Model

### 3.1 Valid States

| State | Description |
|-------|-------------|
| `OUTREACH` | Initial state. Company is a prospect being contacted. |
| `SALES` | Meeting has occurred. Active sales engagement. |
| `CLIENT` | Agreement signed. Company is a customer. |
| `RETIRED` | Company identity has been retired from active use. |

### 3.2 Valid Transitions

```
    ┌──────────┐
    │  MINT    │  (company_unique_id created)
    └────┬─────┘
         │
         ▼
    ┌──────────┐
    │ OUTREACH │
    └────┬─────┘
         │ Meeting Set (verified event)
         ▼
    ┌──────────┐
    │  SALES   │
    └────┬─────┘
         │ Agreement Signed (verified event)
         ▼
    ┌──────────┐
    │  CLIENT  │
    └────┬─────┘
         │ (optional)
         ▼
    ┌──────────┐
    │ RETIRED  │
    └──────────┘
```

### 3.3 Invalid Transitions (Prohibited)

- `SALES` → `OUTREACH` (no regression without merge/retirement)
- `CLIENT` → `SALES` (no regression without merge/retirement)
- `CLIENT` → `OUTREACH` (no regression without merge/retirement)
- Any state → Any state without verified event
- Any state change by non-CL system

---

## 5. Promotion Semantics

### 4.1 Event-Driven Only

Lifecycle promotion is **event-driven**, not status-driven.

- Promotions occur **only** when a verified event is received
- Events must include: source, timestamp, actor, evidence
- CL validates event authenticity before promotion
- No inference, automation, or assumption triggers promotion

### 4.2 Promotion Gates

| Transition | Required Event | Gate Conditions |
|------------|----------------|-----------------|
| OUTREACH → SALES | Meeting Set | Meeting confirmed, attendee verified |
| SALES → CLIENT | Agreement Signed | Contract executed, go-live confirmed |

### 4.3 Sub-Hub Activation

- Sub-hubs are **dormant** until CL activates them
- Activation occurs **only after** promotion gate is satisfied
- CL mints sub-hub UID upon activation
- Sub-hub cannot self-activate

---

## 6. Merge Philosophy

### 5.1 When Merge Occurs

Merge is required when:

- Duplicate company records are discovered
- Company acquisition creates redundant identities
- Data quality issues reveal the same entity under different IDs

### 5.2 Merge Authority

**Only CL** may execute a merge.

No external system, automation, or user interface may merge identities without CL processing the request.

### 5.3 Merge Semantics

```
    ┌──────────────┐     ┌──────────────┐
    │  company_A   │     │  company_B   │
    │  (survivor)  │     │  (absorbed)  │
    └──────┬───────┘     └──────┬───────┘
           │                    │
           │    MERGE EVENT     │
           │◄───────────────────┘
           │
           ▼
    ┌──────────────┐
    │  company_A   │  ← Survivor retains identity
    │  (merged)    │  ← Absorbed ID becomes alias
    └──────────────┘
```

**Merge rules:**

- One identity survives, one is absorbed
- Absorbed ID becomes **alias only**
- All child records re-point to survivor
- Merge is **logged permanently**
- Absorbed ID can **never** be reused

### 5.4 Merge Audit

Every merge records:

- Survivor `company_unique_id`
- Absorbed `company_unique_id`
- Merge timestamp
- Merge actor
- Merge justification
- All affected child records

---

## 7. Retirement Philosophy

### 6.1 When Retirement Occurs

Retirement is appropriate when:

- Company has ceased to exist
- Company is permanently disqualified
- Company requests removal (compliance)
- Data quality reveals invalid record

### 6.2 Retirement Authority

**Only CL** may retire a company identity.

### 6.3 Retirement Semantics

```
    ┌──────────────┐
    │  company_X   │
    │   (active)   │
    └──────┬───────┘
           │
           │  RETIREMENT EVENT
           │
           ▼
    ┌──────────────┐
    │  company_X   │  ← Identity preserved
    │  (RETIRED)   │  ← State = RETIRED
    └──────────────┘  ← No deletion
```

**Retirement rules:**

- Identity is **preserved**, not deleted
- State changes to `RETIRED`
- All sub-hubs are **deactivated**
- Downstream systems are **notified**
- `company_unique_id` can **never** be reused
- Record remains for audit purposes

### 6.4 Retirement Audit

Every retirement records:

- `company_unique_id`
- Retirement timestamp
- Retirement actor
- Retirement reason
- Sub-hubs deactivated
- Downstream notifications sent

---

## 8. External Identity Mapping

### 7.1 External Systems

External systems provide **candidate identities**, not authoritative identities.

Sources include:

- Clay
- LinkedIn
- Web scrapers
- CSV imports
- Third-party data providers
- Weewee.me intake
- Shenandoah Valley Group referrals

### 7.2 Mapping Rules

```
    ┌─────────────────┐
    │ External Source │
    │  (clay_id: 123) │
    └────────┬────────┘
             │
             │  INTAKE
             ▼
    ┌─────────────────┐
    │       CL        │
    │  Evaluates      │
    │  Links/Rejects  │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │         company_X               │
    │  company_unique_id: CMP-001     │
    │  external_ids:                  │
    │    - source: clay, id: 123      │
    │    - source: linkedin, id: 456  │
    └─────────────────────────────────┘
```

**Mapping rules:**

- External IDs are **aliases only**
- `company_unique_id` is **always primary**
- Multiple external IDs may map to one company
- One external ID maps to **at most one** company
- External systems **cannot** override CL identity

### 7.3 Intake Workflow

1. External system submits candidate
2. CL evaluates against existing records
3. CL either:
   - **Links** to existing company (adds alias)
   - **Mints** new company (creates identity)
   - **Rejects** candidate (invalid data)
4. Decision is **logged permanently**

---

## 9. What CL Owns (Exhaustive)

CL owns **and only owns**:

| Attribute | Description |
|-----------|-------------|
| `company_unique_id` | Sovereign, immutable identifier |
| `legal_name` | Canonical company name |
| `cl_stage` | Current lifecycle state |
| `outreach_uid` | Active Outreach sub-hub pointer |
| `sales_uid` | Active Sales sub-hub pointer |
| `client_uid` | Active Client sub-hub pointer |
| `external_ids` | Alias mappings to external systems |
| `created_at` | Identity mint timestamp |
| `created_by` | Identity mint actor |
| `promoted_at` | Last promotion timestamp |
| `promoted_by` | Last promotion actor |
| `retired_at` | Retirement timestamp |
| `retired_by` | Retirement actor |
| `audit_trail` | Immutable event history |

**If a field is not listed above, it does not belong in CL.**

---

## 10. What CL Does NOT Own

CL **must not** contain:

| Data | Belongs To |
|------|-----------|
| Meetings | Outreach / Sales Hub |
| Outreach touches | Outreach Hub |
| Sales pipeline data | Sales Hub |
| Quotes or pricing | Sales Hub |
| Contracts or agreements | Client Hub |
| Enrollment data | Client Hub |
| People or contacts | People Intelligence Hub |
| Documents | Document storage systems |
| Tasks or workflows | Execution systems |
| UI state | Application layer |
| Tool-specific identifiers | Integration layer |
| Enrichment data | Enrichment systems |

CL never executes work.
CL never infers intent.
CL never "progresses" state without an event.

---

## 11. IMO Application to CL

CL implements full **Input-Middle-Output (IMO)** internally.

### Ingress (I)

- Receives verified lifecycle events
- Receives intake candidates
- Validates schema only
- No decisions
- No state mutation

### Middle (M)

- Evaluates lifecycle rules
- Validates promotion eligibility
- Executes merge logic
- Executes retirement logic
- Issues sub-hub IDs
- Updates lifecycle truth

### Egress (O)

- Emits lifecycle state
- Emits active sub-hub pointers
- Emits audit events
- Notifies downstream consumers
- Read-only outputs only

---

## 12. Ecosystem Integration Points

### 11.1 Shenandoah Valley Group

- **Relationship:** Downstream consumer
- **Access:** Read-only company identity
- **Constraint:** Must reference `company_unique_id`
- **Cannot:** Create, modify, or retire companies

### 11.2 Weewee.me

- **Relationship:** Downstream consumer + intake source
- **Access:** Read-only company identity + intake submission
- **Constraint:** Submitted candidates evaluated by CL
- **Cannot:** Directly mint or promote companies

### 11.3 Outreach Hub

- **Relationship:** Child sub-hub
- **Activated by:** CL (at company creation)
- **Keyed to:** `company_unique_id` + `outreach_uid`
- **Reports to:** CL (meeting set events)

### 11.4 Sales Hub

- **Relationship:** Child sub-hub
- **Activated by:** CL (upon OUTREACH → SALES promotion)
- **Keyed to:** `company_unique_id` + `sales_uid`
- **Reports to:** CL (agreement signed events)

### 11.5 Client Hub

- **Relationship:** Child sub-hub
- **Activated by:** CL (upon SALES → CLIENT promotion)
- **Keyed to:** `company_unique_id` + `client_uid`
- **Reports to:** CL (retirement requests)

---

## 13. Altitude Lock

CL operates only at:

| Altitude | Scope |
|----------|-------|
| **30k** | System-wide lifecycle authority |
| **20k** | Domain architecture and hub relationships |

CL **must not** descend to:

| Altitude | Belongs To |
|----------|-----------|
| 10k | Process logic (child hubs) |
| 5k | Execution details (applications) |

---

## 14. Final Declaration

> **CL is the sovereign authority for company identity and lifecycle truth.**
>
> **All other hubs serve CL. CL serves no other hub.**
>
> **The `company_unique_id` is the constitutional anchor for all company data.**
>
> **No system may create, infer, substitute, or override CL identity.**
>
> **This doctrine is frozen.**

---

**Hub ID:** HUB-CL-001
**Doctrine Version:** 1.1
**Status:** Locked
**Last Updated:** 2026-01-01
