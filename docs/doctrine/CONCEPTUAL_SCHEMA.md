# CL Conceptual Schema Definitions

**Purpose and Invariants — No Implementation**

---

## Preamble

This document defines the **conceptual schema** for Company Lifecycle (CL).

This is **not** a database design document. This is **not** SQL. This is **not** an implementation specification.

This document defines:

- **What concepts exist**
- **What invariants must hold**
- **What relationships are allowed**
- **What guarantees CL provides**

Implementation details are the responsibility of engineering teams, constrained by these definitions.

---

## 1. Company Identity

### 1.1 Concept

**Company Identity** is the sovereign record that establishes a company exists within the CL ecosystem.

Every company that interacts with any system (Outreach, Sales, Client, Weewee.me, Shenandoah Valley Group) must have exactly one Company Identity record in CL.

### 1.2 Owned Attributes

| Attribute | Purpose |
|-----------|---------|
| `company_unique_id` | The sovereign, immutable identifier for this company. Format is opaque to consumers. |
| `legal_name` | The canonical, authoritative name of the company. |
| `created_at` | Timestamp when identity was minted. |
| `created_by` | Actor who minted the identity (system or human). |

### 1.3 Invariants

| Invariant | Description |
|-----------|-------------|
| **UNIQUE** | No two Company Identity records may share the same `company_unique_id`. |
| **IMMUTABLE** | Once `company_unique_id` is assigned, it cannot be changed. |
| **NON-REUSABLE** | A retired `company_unique_id` cannot be assigned to a new record. |
| **REQUIRED** | `company_unique_id` and `legal_name` must always have values. |
| **SINGLE SOURCE** | Only CL may create Company Identity records. |

### 1.4 Lifecycle

```
    [ Does Not Exist ]
           │
           │  MINT (by CL only)
           ▼
    [ Company Identity EXISTS ]
           │
           │  (immutable for lifetime)
           │
           ▼
    [ RETIREMENT or MERGE ]
           │
           ▼
    [ Record preserved, state = RETIRED ]
```

### 1.5 Constraints

- Company Identity **cannot** be deleted (only retired)
- Company Identity **cannot** be modified after creation (except `legal_name` corrections)
- Company Identity **must** exist before any sub-hub can reference it

---

## 2. Lifecycle State

### 2.1 Concept

**Lifecycle State** represents the current truth of where a company exists in the business relationship continuum.

This is the **single source of truth** for lifecycle position. No other system may declare lifecycle state.

### 2.2 Owned Attributes

| Attribute | Purpose |
|-----------|---------|
| `cl_stage` | Current lifecycle state (OUTREACH, SALES, CLIENT, RETIRED). |
| `outreach_uid` | Pointer to active Outreach sub-hub (if any). |
| `sales_uid` | Pointer to active Sales sub-hub (if any). |
| `client_uid` | Pointer to active Client sub-hub (if any). |
| `promoted_at` | Timestamp of most recent promotion. |
| `promoted_by` | Actor who triggered most recent promotion. |
| `retired_at` | Timestamp of retirement (if applicable). |
| `retired_by` | Actor who triggered retirement (if applicable). |

### 2.3 Invariants

| Invariant | Description |
|-----------|-------------|
| **SINGLE STATE** | A company can only be in one lifecycle state at a time. |
| **FORWARD ONLY** | Transitions must follow: OUTREACH → SALES → CLIENT → RETIRED. |
| **EVENT REQUIRED** | State cannot change without a verified event. |
| **CL ONLY** | Only CL may modify lifecycle state. |
| **SUB-HUB DEPENDENCY** | Sub-hub pointers only populated when that stage is reached. |

### 2.4 State Definitions

| State | Meaning | Sub-Hubs Active |
|-------|---------|-----------------|
| `OUTREACH` | Company is a prospect. Initial contact phase. | Outreach only |
| `SALES` | Meeting has occurred. Active sales engagement. | Outreach + Sales |
| `CLIENT` | Agreement signed. Active customer. | Outreach + Sales + Client |
| `RETIRED` | No longer active. Preserved for audit. | None (all deactivated) |

### 2.5 Transition Rules

| From | To | Required Event | Sub-Hub Action |
|------|----|----------------|----------------|
| (new) | OUTREACH | Company minted | Activate Outreach |
| OUTREACH | SALES | Meeting Set | Activate Sales |
| SALES | CLIENT | Agreement Signed | Activate Client |
| Any | RETIRED | Retirement requested | Deactivate all |

### 2.6 Constraints

- Regression is **prohibited** (SALES cannot become OUTREACH)
- Skipping is **prohibited** (OUTREACH cannot become CLIENT directly)
- Sub-hub activation **requires** CL promotion
- Sub-hub **cannot** self-promote

---

## 3. Lifecycle History

### 3.1 Concept

**Lifecycle History** is the append-only audit trail of every state transition for a company.

This provides complete traceability of how a company moved through its lifecycle.

### 3.2 Owned Attributes

| Attribute | Purpose |
|-----------|---------|
| `company_unique_id` | Reference to the company this event belongs to. |
| `event_type` | Type of lifecycle event (MINT, PROMOTE, MERGE, RETIRE). |
| `from_state` | State before transition (null for MINT). |
| `to_state` | State after transition. |
| `triggered_by_event` | The verified event that caused this transition. |
| `actor` | Who/what initiated the transition. |
| `timestamp` | When the transition occurred. |
| `evidence` | Reference to supporting documentation. |

### 3.3 Invariants

| Invariant | Description |
|-----------|-------------|
| **APPEND ONLY** | Records can only be added, never modified or deleted. |
| **IMMUTABLE** | Once written, history records cannot be changed. |
| **COMPLETE** | Every state transition must create a history record. |
| **ORDERED** | History records must be chronologically ordered. |
| **TRACEABLE** | Every record must identify actor and triggering event. |

### 3.4 Event Types

| Event Type | Description | Required Fields |
|------------|-------------|-----------------|
| `MINT` | Company identity created | to_state, actor, timestamp |
| `PROMOTE` | Lifecycle state advanced | from_state, to_state, triggered_by_event, actor, timestamp |
| `MERGE` | Two identities consolidated | from_state (absorbed), to_state (survivor), actor, timestamp |
| `RETIRE` | Company identity retired | from_state, to_state=RETIRED, actor, timestamp, evidence |

### 3.5 Constraints

- History **cannot** be backdated
- History **cannot** be edited after creation
- History **must** be created atomically with state change
- History **must** include sufficient detail for audit

---

## 4. External Identity Mapping

### 4.1 Concept

**External Identity Mapping** links external system identifiers to the sovereign `company_unique_id`.

External identifiers are **aliases**, not primary identity. CL remains authoritative.

### 4.2 Owned Attributes

| Attribute | Purpose |
|-----------|---------|
| `company_unique_id` | The sovereign CL identifier this maps to. |
| `source_system` | The external system that provided this identifier. |
| `external_id` | The identifier from the external system. |
| `confidence` | How confident CL is in this mapping (HIGH, MEDIUM, LOW). |
| `linked_at` | When this mapping was established. |
| `linked_by` | Who/what established this mapping. |
| `status` | Whether this mapping is active or deprecated. |

### 4.3 Invariants

| Invariant | Description |
|-----------|-------------|
| **MANY TO ONE** | Multiple external IDs can map to one `company_unique_id`. |
| **UNIQUE PER SOURCE** | An external ID from a given source can only map to one company. |
| **NON-AUTHORITATIVE** | External IDs never override `company_unique_id`. |
| **TRACEABLE** | Every mapping records who created it and when. |
| **PRESERVABLE** | Deprecated mappings are preserved for audit, not deleted. |

### 4.4 Source Systems

| Source | Description | Example External ID |
|--------|-------------|---------------------|
| `clay` | Clay.com enrichment | `clay_rec_abc123` |
| `linkedin` | LinkedIn company page | `linkedin.com/company/12345` |
| `weewee` | Weewee.me intake | `weewee_lead_789` |
| `svgroup` | Shenandoah Valley Group | `svg_client_456` |
| `salesforce` | Salesforce CRM | `sf_account_xyz` |
| `hubspot` | HubSpot CRM | `hs_company_111` |
| `import` | Manual CSV import | `import_batch_2024_001` |

### 4.5 Mapping Lifecycle

```
    [ External ID Submitted ]
           │
           │  CL Evaluation
           ▼
    ┌──────┴──────┐
    │             │
    ▼             ▼
[ LINKED ]    [ REJECTED ]
    │
    │  (if duplicate discovered)
    ▼
[ DEPRECATED ]
    │
    │  (record preserved)
    ▼
[ Audit Trail ]
```

### 4.6 Constraints

- External systems **cannot** create `company_unique_id`
- External IDs are **suggestions**, CL decides
- Mapping changes **must** be audited
- Deprecated mappings **cannot** be reactivated

---

## 5. Sub-Hub Pointers

### 5.1 Concept

**Sub-Hub Pointers** are references from CL to active child hubs (Outreach, Sales, Client).

These are owned by CL but point to external sub-hub systems.

### 5.2 Owned Attributes

| Attribute | Purpose |
|-----------|---------|
| `outreach_uid` | Unique identifier for the Outreach sub-hub instance. |
| `sales_uid` | Unique identifier for the Sales sub-hub instance. |
| `client_uid` | Unique identifier for the Client sub-hub instance. |

### 5.3 Invariants

| Invariant | Description |
|-----------|-------------|
| **CL MINTED** | Only CL may create sub-hub UIDs. |
| **STAGE GATED** | Sub-hub UID only created when lifecycle reaches that stage. |
| **IMMUTABLE** | Once created, sub-hub UIDs cannot be changed. |
| **NULLABLE** | Sub-hub UIDs are null until stage is reached. |
| **DEACTIVATABLE** | Sub-hubs are deactivated (not deleted) on retirement. |

### 5.4 Activation Rules

| Sub-Hub | Activated When | Deactivated When |
|---------|----------------|------------------|
| Outreach | Company minted (OUTREACH state) | Company RETIRED |
| Sales | Promoted to SALES | Company RETIRED |
| Client | Promoted to CLIENT | Company RETIRED |

### 5.5 Constraints

- Sub-hub **cannot** exist without corresponding CL record
- Sub-hub **cannot** self-activate
- Sub-hub **cannot** activate other sub-hubs
- Sub-hub **must** be keyed to both `company_unique_id` AND its own UID

---

## 6. Merge Records

### 6.1 Concept

**Merge Records** document when two company identities are consolidated into one.

This ensures auditability and prevents identity drift.

### 6.2 Owned Attributes

| Attribute | Purpose |
|-----------|---------|
| `merge_id` | Unique identifier for this merge operation. |
| `survivor_id` | The `company_unique_id` that survives. |
| `absorbed_id` | The `company_unique_id` that is absorbed. |
| `merge_reason` | Why these identities were merged. |
| `merged_at` | When the merge occurred. |
| `merged_by` | Who authorized the merge. |
| `affected_records` | Summary of child records re-pointed. |

### 6.3 Invariants

| Invariant | Description |
|-----------|-------------|
| **ONE SURVIVOR** | Exactly one identity survives a merge. |
| **ABSORBED ALIASED** | Absorbed ID becomes alias of survivor. |
| **IMMUTABLE** | Merge records cannot be modified after creation. |
| **COMPLETE** | All affected child records must be documented. |
| **IRREVERSIBLE** | Merges cannot be undone (only new merge if needed). |

### 6.4 Constraints

- Only CL may execute merges
- Absorbed ID **must** be added to survivor's external mappings
- All sub-hub pointers **must** be re-pointed
- All downstream systems **must** be notified

---

## 7. Retirement Records

### 7.1 Concept

**Retirement Records** document when a company identity is permanently removed from active use.

This ensures auditability and compliance.

### 7.2 Owned Attributes

| Attribute | Purpose |
|-----------|---------|
| `retirement_id` | Unique identifier for this retirement operation. |
| `company_unique_id` | The company being retired. |
| `retirement_reason` | Why this identity was retired. |
| `retired_at` | When retirement occurred. |
| `retired_by` | Who authorized retirement. |
| `sub_hubs_deactivated` | List of sub-hubs that were deactivated. |
| `notifications_sent` | List of downstream systems notified. |

### 7.3 Invariants

| Invariant | Description |
|-----------|-------------|
| **PRESERVED** | Retired records are never deleted. |
| **STATE CHANGED** | `cl_stage` must be set to RETIRED. |
| **SUB-HUBS DEACTIVATED** | All active sub-hubs must be deactivated. |
| **IRREVERSIBLE** | Retirement cannot be undone. |
| **AUDITED** | Full audit trail must be preserved. |

### 7.4 Constraints

- Only CL may retire identities
- Retired `company_unique_id` **cannot** be reused
- All downstream systems **must** be notified
- Retirement record **must** include reason

---

## 8. Bootstrap Tables

### 8.1 Identity Staging

**Identity Staging** is the pre-sovereign intake table where company candidates are staged before minting.

| Attribute | Purpose |
|-----------|---------|
| `staging_id` | Primary key for staging record |
| `source_company_id` | Reference to source table record (TEXT, not FK) |
| `source_system` | Origin system |
| `company_name` | Candidate company name |
| `company_domain` | Domain identity anchor |
| `linkedin_company_url` | LinkedIn identity anchor |
| `company_fingerprint` | Idempotency key |
| `eligibility_status` | ELIGIBLE, PARTIAL, or INELIGIBLE |
| `lifecycle_run_id` | Run versioning tag |
| `staged_at` | Staging timestamp |
| `processed_at` | Processing timestamp |

### 8.2 Identity Bridge

**Identity Bridge** maps source company IDs to sovereign IDs. This is the ONLY join surface for downstream consumers.

| Attribute | Purpose |
|-----------|---------|
| `bridge_id` | Primary key |
| `source_company_id` | From source table (UNIQUE) |
| `company_sov_id` | Sovereign ID (UNIQUE, FK to company_identity) |
| `source_system` | Origin system |
| `lifecycle_run_id` | Run versioning tag |
| `minted_at` | Mapping timestamp |
| `minted_by` | Actor who created mapping |

**Invariants:**

| Invariant | Description |
|-----------|-------------|
| **UNIQUE SOURCE** | One source ID maps to exactly one sovereign ID |
| **UNIQUE SOVEREIGN** | One sovereign ID maps to exactly one source ID |
| **NO FK TO SOURCE** | Bridge does not enforce FK to source tables |
| **ONLY JOIN SURFACE** | Downstream consumers MUST join through bridge |

### 8.3 Lifecycle Error

**Lifecycle Error** captures failed intake records for repair and re-entry.

| Attribute | Purpose |
|-----------|---------|
| `error_id` | Primary key |
| `source_company_id` | Source reference |
| `staging_id` | Reference to staging record |
| `failure_stage` | Stage where failure occurred |
| `failure_reason` | Reason code |
| `failure_details` | JSON details |
| `repair_hint` | Guidance for repair |
| `status` | ACTIVE or RESOLVED |
| `attempt_count` | Retry counter |
| `lifecycle_run_id` | Run versioning tag |

**Invariants:**

| Invariant | Description |
|-----------|-------------|
| **REPAIR-REENTRY** | Repaired records re-enter at same stage |
| **NO SOURCE MUTATION** | Errors never modify source tables |
| **TRACEABLE** | Every error has reason and repair hint |

---

## 9. Schema Relationship Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMPANY IDENTITY                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ company_unique_id (PK, immutable, sovereign)            │    │
│  │ legal_name                                              │    │
│  │ created_at, created_by                                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              │ 1:1                              │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              LIFECYCLE STATE                            │    │
│  │ cl_stage (OUTREACH | SALES | CLIENT | RETIRED)          │    │
│  │ outreach_uid, sales_uid, client_uid                     │    │
│  │ promoted_at, promoted_by, retired_at, retired_by        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│              ┌───────────────┼───────────────┐                  │
│              │               │               │                  │
│              ▼               ▼               ▼                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ LIFECYCLE    │  │ EXTERNAL     │  │ MERGE /      │          │
│  │ HISTORY      │  │ IDENTITY     │  │ RETIREMENT   │          │
│  │ (1:many)     │  │ MAPPING      │  │ RECORDS      │          │
│  │ append-only  │  │ (1:many)     │  │ (1:many)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ References (via company_unique_id)
                              ▼
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ OUTREACH │   │  SALES   │   │  CLIENT  │
        │ Sub-Hub  │   │ Sub-Hub  │   │ Sub-Hub  │
        │ (child)  │   │ (child)  │   │ (child)  │
        └──────────┘   └──────────┘   └──────────┘
```

---

## 9. Guarantees

CL provides the following guarantees to all consumers:

| Guarantee | Description |
|-----------|-------------|
| **Identity Uniqueness** | No two companies share the same `company_unique_id`. |
| **Identity Permanence** | Once created, identity persists forever (even if retired). |
| **State Consistency** | Lifecycle state is always valid and consistent. |
| **Audit Completeness** | Every state change is recorded and traceable. |
| **Merge Integrity** | Merged identities are properly aliased and audited. |
| **Retirement Preservation** | Retired records are preserved, not deleted. |

---

## 10. Anti-Patterns (Prohibited)

The following patterns violate CL schema doctrine:

| Anti-Pattern | Why Prohibited |
|--------------|----------------|
| Storing `company_unique_id` as mutable | Violates identity immutability |
| Creating company records outside CL | Violates single source of truth |
| Deleting company records | Violates preservation requirement |
| Modifying history records | Violates append-only invariant |
| Backdating events | Violates audit integrity |
| Skipping lifecycle states | Violates forward-only transitions |
| Self-promoting sub-hubs | Violates CL promotion authority |

---

**Doctrine Version:** 1.1
**Status:** Locked
**Last Updated:** 2026-01-01
