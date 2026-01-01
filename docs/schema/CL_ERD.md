# Company Lifecycle (CL) — Entity Relationship Diagram

**Schema:** `cl`
**Status:** Doctrine-Locked
**Version:** 1.0
**Last Updated:** 2026-01-01

---

## 1. Canonical Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CANONICAL CL DATA FLOW                             │
│                                                                              │
│   Source Company Tables                                                      │
│   (company.company_master)     ◄── READ-ONLY, NEVER MUTATED                 │
│            │                                                                 │
│            │ COPY (never move)                                               │
│            ▼                                                                 │
│   ┌────────────────────────────┐                                            │
│   │  CL Identity Staging       │                                            │
│   │  (company_lifecycle_       │                                            │
│   │   identity_staging)        │                                            │
│   └────────────┬───────────────┘                                            │
│                │                                                             │
│         ┌──────┴──────┐                                                      │
│         │             │                                                      │
│    ELIGIBLE      INELIGIBLE                                                  │
│         │             │                                                      │
│         ▼             ▼                                                      │
│   ┌──────────┐  ┌──────────────┐                                            │
│   │  MINT    │  │    ERROR     │                                            │
│   │sovereign │  │   ROUTING    │                                            │
│   │   ID     │  └──────┬───────┘                                            │
│   └────┬─────┘         │                                                     │
│        │               ▼                                                     │
│        │    ┌──────────────────────┐                                        │
│        │    │  CL Lifecycle Error  │                                        │
│        │    │  (company_lifecycle_ │◄── REPAIR → RE-ENTRY                   │
│        │    │       error)         │    (same stage)                        │
│        │    └──────────────────────┘                                        │
│        │                                                                     │
│        ▼                                                                     │
│   ┌────────────────────────────┐                                            │
│   │  CL Sovereign Identity     │                                            │
│   │  (company_identity)        │                                            │
│   │  company_sov_id = UUID     │◄── ONLY CL MINTS SOVEREIGN IDs            │
│   └────────────┬───────────────┘                                            │
│                │                                                             │
│                │ 1:1 mapping                                                 │
│                ▼                                                             │
│   ┌────────────────────────────┐                                            │
│   │  CL Bridge Mapping         │                                            │
│   │  (company_identity_bridge) │◄── ONLY JOIN SURFACE FOR CONSUMERS        │
│   │  source_id ↔ company_sov_id│                                            │
│   └────────────┬───────────────┘                                            │
│                │                                                             │
│                │ References (via company_sov_id)                             │
│                ▼                                                             │
│   ┌────────────────────────────────────────────────────────────────┐        │
│   │                     DOWNSTREAM CONSUMERS                        │        │
│   ├────────────────────────────────────────────────────────────────┤        │
│   │  Outreach Hub │ Sales Hub │ Client Hub │ External Systems       │        │
│   │                                                                 │        │
│   │  ALL consumers join ONLY through bridge table                   │        │
│   │  NO direct FK to source tables                                  │        │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CL SCHEMA (cl.*)                                │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌───────────────────────────────────────────────────────────────────┐
   │              company_lifecycle_identity_staging                    │
   │  (Intake staging - pre-sovereign)                                  │
   ├───────────────────────────────────────────────────────────────────┤
   │  PK  staging_id              UUID                                  │
   │      source_company_id       TEXT        ← from source table       │
   │      source_system           TEXT                                  │
   │      company_name            TEXT                                  │
   │      company_domain          TEXT        (nullable)                │
   │      linkedin_company_url    TEXT        (nullable)                │
   │      company_state           TEXT        (nullable)                │
   │      company_fingerprint     TEXT        ← idempotency key         │
   │      eligibility_status      TEXT        ELIGIBLE|PARTIAL|INELIGIBLE│
   │      rejection_reason        TEXT        (nullable)                │
   │      lifecycle_run_id        TEXT        ← run versioning          │
   │      staged_at               TIMESTAMPTZ                           │
   │      processed_at            TIMESTAMPTZ (nullable)                │
   └───────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
               ELIGIBLE                        INELIGIBLE
                    │                               │
                    ▼                               ▼
   ┌─────────────────────────────────┐    ┌─────────────────────────────┐
   │        company_identity         │    │   company_lifecycle_error   │
   │  (Sovereign identity - PRIMARY) │    │  (Error routing + repair)   │
   ├─────────────────────────────────┤    ├─────────────────────────────┤
   │  PK  company_unique_id    UUID  │    │  PK  error_id         UUID  │
   │      company_name         TEXT  │    │      source_company_id TEXT │
   │      company_domain       TEXT  │    │  FK  staging_id       UUID  │
   │      linkedin_company_url TEXT  │    │      failure_stage    TEXT  │
   │      company_fingerprint  TEXT  │    │      failure_reason   TEXT  │
   │      source_system        TEXT  │    │      failure_details  JSONB │
   │      lifecycle_run_id     TEXT  │    │      repair_hint      TEXT  │
   │      created_at       TIMESTAMPTZ│    │      status           TEXT  │
   │                                 │    │      attempt_count    INT   │
   │  UNIQUE(company_fingerprint)    │    │      lifecycle_run_id TEXT  │
   └─────────────────────────────────┘    │      created_at   TIMESTAMPTZ│
                    │                     │      updated_at   TIMESTAMPTZ│
                    │ 1:1                 └─────────────────────────────┘
                    ▼                               │
   ┌─────────────────────────────────┐              │
   │    company_identity_bridge      │              │
   │  (Source ↔ Sovereign mapping)   │    REPAIR ───┘
   ├─────────────────────────────────┤    RE-ENTRY
   │  PK  bridge_id            UUID  │    (same stage)
   │      source_company_id    TEXT  │◄── UNIQUE
   │  FK  company_sov_id       UUID  │◄── UNIQUE (to company_identity)
   │      source_system        TEXT  │
   │      lifecycle_run_id     TEXT  │
   │      minted_at        TIMESTAMPTZ│
   │      minted_by            TEXT  │
   │                                 │
   │  UNIQUE(source_company_id)      │
   │  UNIQUE(company_sov_id)         │
   └─────────────────────────────────┘
                    │
                    │  ONLY JOIN SURFACE
                    │  for consumers
                    ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                    DOWNSTREAM CONSUMERS                         │
   │  (Join via company_sov_id through bridge table ONLY)            │
   ├─────────────────────────────────────────────────────────────────┤
   │  • Outreach Hub                                                 │
   │  • Sales Hub                                                    │
   │  • Client Hub                                                   │
   │  • Shenandoah Valley Group                                      │
   │  • Weewee.me                                                    │
   │  • All future systems                                           │
   └─────────────────────────────────────────────────────────────────┘
```

---

## 3. Table Ownership

| Table | Schema | Owner | Purpose |
|-------|--------|-------|---------|
| `company_lifecycle_identity_staging` | cl | CL | Pre-sovereign intake staging |
| `company_identity` | cl | CL | Sovereign identity (PRIMARY) |
| `company_identity_bridge` | cl | CL | Source ↔ Sovereign mapping |
| `company_lifecycle_error` | cl | CL | Error routing and repair |

---

## 4. Key Relationships

### 4.1 No FK to Source Tables

```
IMPORTANT: There is NO foreign key pointing back to source tables.

Source tables (company.company_master) are:
  - READ-ONLY from CL's perspective
  - NEVER mutated by CL
  - Referenced only by TEXT ID (source_company_id)

The bridge table holds the mapping but does NOT enforce FK to source.
This is intentional: CL does not own source tables.
```

### 4.2 company_sov_id Ownership

```
company_sov_id (company_unique_id) is:
  - MINTED only in cl.company_identity
  - REFERENCED in cl.company_identity_bridge
  - USED BY downstream consumers (via bridge)
  - IMMUTABLE once created
  - NEVER reused after retirement
```

### 4.3 Bridge as Join Surface

```
Downstream systems MUST:
  1. Look up source_company_id in bridge table
  2. Get company_sov_id from bridge
  3. Use company_sov_id for all operations

Downstream systems MUST NOT:
  - Join directly to company_identity without bridge
  - Store or reference source_company_id as primary key
  - Create their own company identifiers
```

---

## 5. Data Flow Rules (Invariants)

| Rule | Description |
|------|-------------|
| **COPY-NEVER-MOVE** | Data is copied from source to staging, never moved |
| **READ-ONLY-SOURCE** | Source tables are never mutated by CL |
| **ONE-WAY-FLOW** | Data flows source → staging → identity → bridge → consumers |
| **NO-BACKWARD-WRITES** | CL never writes back to source tables |
| **ERROR-REPAIR-REENTRY** | Errors go to error table, repair re-enters same stage |
| **IDEMPOTENT-MINTING** | Fingerprint ensures one sovereign ID per unique company |
| **BRIDGE-ONLY-JOIN** | Consumers join only through bridge, never direct to identity |

---

## 6. Idempotency Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    IDEMPOTENCY GUARD                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  company_fingerprint = LOWER(TRIM(domain)) || '|'               │
│                      || LOWER(TRIM(linkedin_url))               │
│                                                                 │
│  Enforced by:                                                   │
│    - UNIQUE INDEX on company_identity(company_fingerprint)      │
│    - Re-runs cannot create duplicate sovereign IDs              │
│    - One company_sov_id per fingerprint, forever                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Error → Repair → Re-entry Loop

```
┌──────────────┐
│  FAIL at     │
│  Stage X     │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ company_lifecycle_   │
│ error                │
│ - failure_stage = X  │
│ - failure_reason     │
│ - repair_hint        │
│ - status = ACTIVE    │
└──────┬───────────────┘
       │
       │  REPAIR (manual or automated)
       │
       ▼
┌──────────────────────┐
│ RE-ENTER at Stage X  │
│ (not Stage X+1)      │
│                      │
│ New staging record   │
│ references repaired  │
│ data                 │
└──────────────────────┘
```

---

## 8. Lifecycle Run Versioning

```
┌─────────────────────────────────────────────────────────────────┐
│                 LIFECYCLE RUN VERSIONING                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  lifecycle_run_id = "RUN-YYYY-MM-DDTHH-MM-SS"                   │
│                                                                 │
│  Stamped on:                                                    │
│    - company_lifecycle_identity_staging.lifecycle_run_id        │
│    - company_identity.lifecycle_run_id                          │
│    - company_identity_bridge.lifecycle_run_id                   │
│    - company_lifecycle_error.lifecycle_run_id                   │
│                                                                 │
│  Rules:                                                         │
│    - Every lifecycle action tagged with run ID                  │
│    - Prior runs NEVER overwritten                               │
│    - Enables audit trail and rollback                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**ERD Version:** 1.0
**Doctrine Status:** Locked
