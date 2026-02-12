# Company Lifecycle (CL) — Entity Relationship Diagram

**Schemas:** `cl`, `lcs`
**Status:** Doctrine-Locked
**Version:** 2.0
**Last Updated:** 2026-02-12

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

## 9. Identity Anchor Doctrine (ADR-003)

```
┌─────────────────────────────────────────────────────────────────┐
│                    IDENTITY ANCHOR DOCTRINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Identity Anchor Rule:                                          │
│    domain IS NOT NULL  OR  linkedin_url IS NOT NULL             │
│                                                                 │
│  Field Nullability:                                             │
│    ┌──────────────────┬──────────┬──────────┐                  │
│    │ Field            │ Required │ Nullable │                  │
│    ├──────────────────┼──────────┼──────────┤                  │
│    │ website_url      │ NO       │ YES      │                  │
│    │ linkedin_url     │ NO       │ YES      │                  │
│    └──────────────────┴──────────┴──────────┘                  │
│                                                                 │
│  Constraint: chk_identity_anchor                                │
│    CHECK (website_url IS NOT NULL OR linkedin_url IS NOT NULL)  │
│                                                                 │
│  Rationale:                                                     │
│    - Many companies have only LinkedIn (early-stage B2B)        │
│    - Some companies have only website (no LinkedIn page)        │
│    - Requiring BOTH would reject valid companies                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. State Expansion (ADR-003)

```
┌─────────────────────────────────────────────────────────────────┐
│                       STATE EXPANSION                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Constraint: chk_state_valid                                    │
│                                                                 │
│  Current Allowed States (v1.1):                                 │
│    PA, VA, MD, OH, WV, KY, DE, OK, NC                          │
│                                                                 │
│  Expansion Rules:                                               │
│    1. New states require ADR authorization                      │
│    2. Must be documented before or immediately after run        │
│    3. No silent expansions                                      │
│                                                                 │
│  State Code Reference:                                          │
│    NC = 37 (FIPS)                                               │
│    ID Format: 04.04.01.{STATE_CODE}.{SEQ}.{SUB}                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. LCS Schema (SUBHUB-CL-LCS) — v2.2.0

### 11.1 LCS Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LCS CANONICAL DATA FLOW                           │
│                                                                             │
│   Sub-Hub Pressure Signals                                                  │
│   (people/dol/blog.pressure_signals)  ◄── READ-ONLY, LCS NEVER WRITES      │
│            │                                                                │
│            │ BRIDGE (bridge_pressure_signals — pg_cron 15 min)              │
│            ▼                                                                │
│   ┌────────────────────────────┐                                           │
│   │  LCS Signal Queue          │                                           │
│   │  (lcs.signal_queue)        │ ◄── PENDING → COMPLETED/FAILED/SKIPPED   │
│   └────────────┬───────────────┘                                           │
│                │                                                            │
│                │ Cron Runner reads PENDING                                  │
│                ▼                                                            │
│   ┌────────────────────────────┐                                           │
│   │  9-Step IMO Pipeline       │                                           │
│   │  Signal → Collect → Frame  │                                           │
│   │  → Mint → Audience →       │                                           │
│   │  Adapter → Log → Error     │                                           │
│   └────────────┬───────────────┘                                           │
│                │                                                            │
│         ┌──────┴──────┐                                                     │
│         │             │                                                     │
│      SUCCESS       FAILURE                                                  │
│         │             │                                                     │
│         ▼             ▼                                                     │
│   ┌──────────┐  ┌──────────────┐                                           │
│   │  CET     │  │   ERR0       │                                           │
│   │(lcs.event│  │ (lcs.err0)   │ ◄── ORBT 3-strike protocol               │
│   │ APPEND   │  │  APPEND-ONLY │                                           │
│   │  ONLY)   │  └──────────────┘                                           │
│   └────┬─────┘                                                              │
│        │                                                                    │
│        │ Nightly matview refresh                                            │
│        ▼                                                                    │
│   ┌────────────────────────────────────────────────────────────────┐       │
│   │               MATERIALIZED VIEWS (read-only)                    │       │
│   ├────────────────────────────────────────────────────────────────┤       │
│   │  v_latest_by_entity     │ Latest event per entity              │       │
│   │  v_latest_by_company    │ Latest event per company             │       │
│   │  v_company_intelligence │ Cross-sub-hub intelligence snapshot  │       │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 LCS Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LCS SCHEMA (lcs.*)                             │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌───────────────────────────────────────────────────────────────────┐
   │                         lcs.event (CET)                           │
   │  (Canonical Event Table — APPEND-ONLY, partitioned monthly)       │
   ├───────────────────────────────────────────────────────────────────┤
   │  PK  communication_id     TEXT        ← ULID, immutable          │
   │  PK  created_at           TIMESTAMPTZ ← partition key             │
   │      message_run_id       TEXT        ← delivery attempt ID       │
   │      sovereign_company_id UUID        ← from cl.company_identity  │
   │      entity_type          TEXT        ← 'slot' | 'person'        │
   │      entity_id            UUID        ← upstream entity           │
   │      signal_set_hash      TEXT        → lcs.signal_registry       │
   │      frame_id             TEXT        → lcs.frame_registry        │
   │      adapter_type         TEXT        → lcs.adapter_registry      │
   │      channel              TEXT        ← MG | HR | SH             │
   │      delivery_status      TEXT        ← PENDING→DELIVERED/FAILED  │
   │      lifecycle_phase      TEXT        ← OUTREACH|SALES|CLIENT    │
   │      event_type           TEXT        ← 20 canonical types        │
   │      lane                 TEXT        ← MAIN|LANE_A|LANE_B|NEWS  │
   │      agent_number         TEXT        ← territory agent           │
   │      step_number          INT         ← 0-9 pipeline step        │
   │      step_name            TEXT        ← human-readable step       │
   │      payload              JSONB       ← compiled message (nullable)│
   │      adapter_response     JSONB       ← raw response (nullable)   │
   │      intelligence_tier    INT         ← 1-5 from matview          │
   │      sender_identity      TEXT        ← sender persona            │
   │                                                                    │
   │  PARTITIONED BY RANGE (created_at)                                │
   │  Trigger: trg_lcs_event_immutable_comm_id                         │
   └───────────────────────────────────────────────────────────────────┘
          │ 1:N (by value)
          ▼
   ┌───────────────────────────────────────────────────────────────────┐
   │                         lcs.err0                                  │
   │  (Error Table — APPEND-ONLY, ORBT 3-strike protocol)             │
   ├───────────────────────────────────────────────────────────────────┤
   │  PK  error_id              UUID       ← auto-generated           │
   │      message_run_id        TEXT       ← links to delivery attempt │
   │      communication_id      TEXT       ← nullable (pre-CET fail)  │
   │      sovereign_company_id  TEXT       ← nullable cross-ref       │
   │      failure_type          TEXT       ← 11 canonical types        │
   │      failure_message       TEXT       ← error description         │
   │      lifecycle_phase       TEXT       ← nullable                  │
   │      adapter_type          TEXT       ← which adapter failed      │
   │      orbt_strike_number    INT        ← 1, 2, or 3              │
   │      orbt_action_taken     TEXT       ← AUTO_RETRY|ALT_CHANNEL|  │
   │                                         HUMAN_ESCALATION          │
   │      orbt_alt_channel_eligible BOOLEAN                            │
   │      orbt_alt_channel_reason   TEXT                               │
   │      created_at            TIMESTAMPTZ                            │
   └───────────────────────────────────────────────────────────────────┘

   ┌───────────────────────────────────────────────────────────────────┐
   │                      lcs.signal_queue                             │
   │  (Signal Queue — MUTABLE, bridged from sub-hub pressure_signals) │
   ├───────────────────────────────────────────────────────────────────┤
   │  PK  id                    UUID       ← auto-generated           │
   │      signal_set_hash       TEXT       → lcs.signal_registry       │
   │      signal_category       TEXT       ← signal classification     │
   │      sovereign_company_id  UUID       ← target company           │
   │      lifecycle_phase       TEXT       ← OUTREACH|SALES|CLIENT    │
   │      preferred_channel     TEXT       ← nullable routing hint     │
   │      preferred_lane        TEXT       ← nullable routing hint     │
   │      agent_number          TEXT       ← nullable routing hint     │
   │      signal_data           JSONB      ← from pressure_signals     │
   │      source_hub            TEXT       ← PEOPLE|DOL|BLOG|MANUAL   │
   │      source_signal_id      UUID       ← traceability (nullable)  │
   │      status                TEXT       ← PENDING→COMPLETED/FAILED │
   │      priority              INT        ← 0=low, 1=normal, 2=high  │
   │      created_at            TIMESTAMPTZ                            │
   │      processed_at          TIMESTAMPTZ ← nullable                 │
   │                                                                    │
   │  UNIQUE (source_hub, source_signal_id)                            │
   │    WHERE source_signal_id IS NOT NULL AND status = 'PENDING'      │
   └───────────────────────────────────────────────────────────────────┘

   ┌───────────────────────────────────────────────────────────────────┐
   │                    lcs.signal_registry                            │
   │  (Signal Registry — CONFIG, soft-deactivate only)                │
   ├───────────────────────────────────────────────────────────────────┤
   │  PK  signal_set_hash       TEXT       ← deterministic hash       │
   │      signal_name           TEXT       ← human-readable (UNIQUE)  │
   │      lifecycle_phase       TEXT       ← OUTREACH|SALES|CLIENT    │
   │      signal_category       TEXT       ← 9 canonical categories   │
   │      description           TEXT       ← nullable                  │
   │      data_fetched_at       TIMESTAMPTZ ← last fetch timestamp     │
   │      data_expires_at       TIMESTAMPTZ ← computed expiry          │
   │      freshness_window      INTERVAL   ← default 30 days          │
   │      signal_validity_score NUMERIC    ← 0.00-1.00                │
   │      validity_threshold    NUMERIC    ← default 0.50             │
   │      is_active             BOOLEAN    ← soft-deactivate          │
   │      created_at            TIMESTAMPTZ                            │
   │      updated_at            TIMESTAMPTZ                            │
   └───────────────────────────────────────────────────────────────────┘

   ┌───────────────────────────────────────────────────────────────────┐
   │                    lcs.frame_registry                             │
   │  (Frame Registry — CONFIG, soft-deactivate only)                 │
   ├───────────────────────────────────────────────────────────────────┤
   │  PK  frame_id              TEXT       ← unique frame identifier  │
   │      frame_name            TEXT       ← human-readable (UNIQUE)  │
   │      lifecycle_phase       TEXT       ← OUTREACH|SALES|CLIENT    │
   │      frame_type            TEXT       ← 7 canonical types         │
   │      tier                  INT        ← intelligence tier 1-5    │
   │      required_fields       JSONB      ← fields from matview      │
   │      fallback_frame        TEXT       ← self-ref to frame_id     │
   │      channel               TEXT       ← MG | HR (nullable)       │
   │      step_in_sequence      INT        ← nullable for non-seq     │
   │      description           TEXT       ← nullable                  │
   │      is_active             BOOLEAN    ← soft-deactivate          │
   │      created_at            TIMESTAMPTZ                            │
   │      updated_at            TIMESTAMPTZ                            │
   └───────────────────────────────────────────────────────────────────┘

   ┌───────────────────────────────────────────────────────────────────┐
   │                   lcs.adapter_registry                            │
   │  (Adapter Registry — CONFIG, soft-deactivate only)               │
   ├───────────────────────────────────────────────────────────────────┤
   │  PK  adapter_type          TEXT       ← unique adapter ID        │
   │      adapter_name          TEXT       ← human-readable (UNIQUE)  │
   │      channel               TEXT       ← MG | HR | SH            │
   │      direction             TEXT       ← outbound | inbound       │
   │      description           TEXT       ← nullable                  │
   │      domain_rotation_config JSONB     ← MG only (nullable)       │
   │      health_status         TEXT       ← HEALTHY|DEGRADED|PAUSED  │
   │      daily_cap             INT        ← nullable max sends/day   │
   │      sent_today            INT        ← counter, reset daily     │
   │      bounce_rate_24h       NUMERIC    ← rolling 24h bounce       │
   │      complaint_rate_24h    NUMERIC    ← rolling 24h complaint    │
   │      auto_pause_rules      JSONB      ← threshold config         │
   │      is_active             BOOLEAN    ← soft-deactivate          │
   │      created_at            TIMESTAMPTZ                            │
   │      updated_at            TIMESTAMPTZ                            │
   └───────────────────────────────────────────────────────────────────┘
```

### 11.3 LCS Table Ownership

| Table | Schema | Owner | Classification | Purpose |
|-------|--------|-------|----------------|---------|
| `event` | lcs | LCS | APPEND-ONLY | Canonical Event Table (CET) — all communication events |
| `err0` | lcs | LCS | APPEND-ONLY | Error log with ORBT 3-strike protocol |
| `signal_queue` | lcs | LCS | QUEUE (mutable) | Bridged pressure signals awaiting pipeline processing |
| `signal_registry` | lcs | LCS | REGISTRY (config) | Signal set catalog with freshness tracking |
| `frame_registry` | lcs | LCS | REGISTRY (config) | Message frame catalog with tier requirements |
| `adapter_registry` | lcs | LCS | REGISTRY (config) | Delivery adapter catalog with health monitoring |
| `v_latest_by_entity` | lcs | LCS | READ-ONLY MATVIEW | Latest event per entity (refreshed nightly 2:30 AM) |
| `v_latest_by_company` | lcs | LCS | READ-ONLY MATVIEW | Latest event per company (refreshed nightly 2:30 AM) |
| `v_company_intelligence` | lcs | LCS | READ-ONLY MATVIEW | Cross-sub-hub intelligence snapshot (refreshed nightly 2:00 AM) |

### 11.4 LCS Join Surface

```
cl.company_identity (spine)
    │
    │ sovereign_company_id (by value, not FK)
    │
    ├──── lcs.event                   1:N   All communication events
    │         │
    │         ├── lcs.err0            1:N   Errors for a delivery (via message_run_id)
    │         ├── lcs.signal_registry N:1   Signal config (via signal_set_hash)
    │         ├── lcs.frame_registry  N:1   Frame config (via frame_id)
    │         └── lcs.adapter_registry N:1  Adapter config (via adapter_type)
    │
    ├──── lcs.signal_queue            1:N   Queued pressure signals
    │         │
    │         └── lcs.signal_registry N:1   Signal config (via signal_set_hash)
    │
    └──── Materialized Views (denormalized read surfaces)
              ├── lcs.v_latest_by_entity      DISTINCT ON (entity_type, entity_id)
              ├── lcs.v_latest_by_company      DISTINCT ON (sovereign_company_id)
              └── lcs.v_company_intelligence   Cross-sub-hub join snapshot
```

### 11.5 LCS Key Relationships

**Dual-ID Model (CET)**:
- `communication_id` = WHY this event exists (ULID, immutable, format: `LCS-{PHASE}-{YYYYMMDD}-{ULID}`)
- `message_run_id` = WHO sent it, WHICH channel, WHICH attempt (format: `RUN-{COMM_ID}-{CHANNEL}-{ATTEMPT}`)

**ORBT Protocol (err0)**:
- Strike 1: `AUTO_RETRY` — same channel, automatic retry
- Strike 2: `ALT_CHANNEL` — try alternate delivery channel if eligible
- Strike 3: `HUMAN_ESCALATION` — route to human, system gives up

**By-Value Joins (no FK enforcement)**:
- LCS tables carry `sovereign_company_id` by value from `cl.company_identity`
- Registry lookups are by-value (`signal_set_hash`, `frame_id`, `adapter_type`)
- `err0` links to `event` via `message_run_id` by value

### 11.6 LCS Data Flow Rules

| Rule | Description |
|------|-------------|
| **APPEND-ONLY-CET** | lcs.event is append-only. No UPDATE (except immutability trigger), no DELETE |
| **APPEND-ONLY-ERR0** | lcs.err0 is append-only. Never blocks CET writes |
| **READ-ONLY-SUBHUBS** | LCS reads sub-hub data (people, dol, blog). LCS never writes to sub-hub tables |
| **SIGNAL-BRIDGE-ONLY** | Pressure signals enter LCS only through bridge_pressure_signals() into signal_queue |
| **BY-VALUE-JOINS** | All cross-table references are by value, not FK — enabling independent schema evolution |
| **IDEMPOTENT-BRIDGE** | Signal queue dedup: UNIQUE(source_hub, source_signal_id) WHERE status = 'PENDING' |
| **MONTHLY-PARTITION** | CET is partitioned by RANGE on created_at, one partition per month |

---

**ERD Version:** 2.0
**Doctrine Status:** Locked
**ADR Reference:** ADR-003
**LCS Version:** v2.2.0
