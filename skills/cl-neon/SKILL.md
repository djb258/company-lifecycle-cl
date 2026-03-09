---
name: cl-neon
description: >
  Neon PostgreSQL configuration, schema layout, and operational patterns for the Company Lifecycle
  hub (HUB-CL-001). Covers the cl schema (company_candidate, company_identity, company_identity_bridge,
  company_names, company_domains, identity_confidence, domain_hierarchy), the lcs schema (event,
  signal_queue, signal_registry, frame_registry, adapter_registry, cid, sid_output, mid_sequence_state),
  error tables (cl_errors, cl_err_existence, identity_gate_audit, identity_gate_failures), views
  (v_company_identity_eligible, v_company_lifecycle_status, v_company_promotable, v_identity_gate_summary,
  v_latest_by_company, v_latest_by_entity, v_company_intelligence), and CTB/doctrine tables.
  Trigger on: Neon, PostgreSQL, Postgres, cl schema, lcs schema, company_identity, company_candidate,
  identity_bridge, signal_queue, lifecycle state machine, identity minting, LCS pipeline, CID compiler,
  SID worker, MID engine, confidence scoring, identity gate, existence verification, write-once pointers,
  neon-agent, migration, or any reference to the relational data layer in this hub. Also trigger when
  discussing company ingestion, verification, eligibility, stage transitions, outreach attachment,
  lifecycle pointers, or pipeline delivery tables.
---

# cl-neon — Company Lifecycle Neon Skill

Company Lifecycle (HUB-CL-001) uses Neon Serverless PostgreSQL as its sole data layer.
106,000+ company identity records, a lifecycle communication spine (LCS) with CID/SID/MID
pipeline tables, and a neon-agent CLI for migrations, audits, gates, and promotions.

**Master skill reference:** `IMO-Creator/skills/neon/SKILL.md`

## What This Repo Uses

| Component | Detail |
|-----------|--------|
| Database | Neon Serverless PostgreSQL |
| Host | `ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech` |
| Database name | Marketing DB |
| Driver (pipeline) | `pg` ^8.16.3 (node-postgres) |
| Driver (neon-agent) | `pg` ^8.11.3 |
| UI framework | Lovable-generated React + Vite (see `cl-lovable` skill) |
| Supabase client | `@supabase/supabase-js` ^2.89.0 (UI data access layer) |
| Secrets | Doppler (`doppler.yaml`) |
| Neon agent | `neon/agent/` — Commander CLI with migrate, audit, gate, promote, health, sync |
| Pool config | max: 10, idleTimeout: 30s, connectionTimeout: 10s |

## Connection Configuration

| Env Var | Purpose | Required |
|---------|---------|----------|
| `VITE_DATABASE_URL` | Full Neon pooled connection string (primary) | Yes |
| `DATABASE_URL` | Fallback connection string | Fallback |
| `VITE_NEON_HOST` | Neon host endpoint | Doppler |
| `VITE_NEON_DATABASE` | Database name (Marketing DB) | Doppler |
| `VITE_NEON_USER` | Database user | Doppler |
| `VITE_NEON_PASSWORD` | Database password | Doppler |
| `HUB_ID` | Hub identifier (HUB-CL-001) | Doppler |

Connection string pattern (pooled):
```
postgresql://Marketing%20DB_owner:<password>@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require
```

Secrets managed via Doppler. No `.env` files in production. Run with `doppler run -- <command>`.

## Schema / Data Model

### cl schema — Identity Tables (Core)

| Table | Rows | Purpose |
|-------|------|---------|
| `cl.company_identity` | 106,065 | Sovereign identity registry. 33 columns. PK: `company_unique_id`. Write-once lifecycle pointers (outreach_id, sales_process_id, client_id). |
| `cl.company_names` | — | Multi-name per company (legal, trade, DBA). 13 columns. `is_primary` flag. |
| `cl.company_domains` | — | Domain records with DNS/SSL/WHOIS. 24 columns. `is_primary` flag. |
| `cl.identity_confidence` | — | Multi-dimensional confidence scoring (0-100). 18 columns. 1:1 with company_identity. |
| `cl.company_identity_bridge` | — | External ID mapping (SoV IDs). 12 columns. Match confidence + evidence. |
| `cl.domain_hierarchy` | — | Parent-child domain relationships. |
| `cl.company_candidate` | — | Ingestion staging. Status flow: pending -> verified -> minted (or failed). 13 columns. |

### cl schema — Error & Audit Tables

| Table | Purpose |
|-------|---------|
| `cl.cl_errors` | Lifecycle processing errors with retry logic (retry_count, retry_ceiling, retry_after) |
| `cl.cl_err_existence` | Existence verification failures (domain status, redirect chain, name match) |
| `cl.identity_gate_audit` | Identity gate check audit trail (PASS/FAIL per run) |
| `cl.identity_gate_failures` | Individual gate check failure records |

### cl schema — Views

| View | Purpose |
|------|---------|
| `cl.v_company_identity_eligible` | Eligible for identity verification (confidence + data completeness) |
| `cl.v_company_lifecycle_status` | Denormalized lifecycle status with primary name/domain |
| `cl.v_company_promotable` | Companies meeting promotion criteria (confidence >= 70, name + domain/LinkedIn) |
| `cl.v_identity_gate_summary` | Aggregated gate audit results per company |

### lcs schema — Lifecycle Communication Spine

| Table / View | Classification | Purpose |
|-------------|----------------|---------|
| `lcs.event` | CANONICAL | Final event records with all IDs |
| `lcs.signal_queue` | — | Pending signals for CID compilation |
| `lcs.signal_registry` | — | Signal type definitions |
| `lcs.frame_registry` | — | Communication frame definitions (+ CID/SID/MID config columns) |
| `lcs.adapter_registry` | — | Delivery adapter definitions (MG, HR, SH) |
| `lcs.err0` | ERROR | LCS error table |
| `lcs.cid` | CANONICAL | CID compiler output. Append-only. PK: `communication_id`. |
| `lcs.sid_output` | STAGING | SID message construction output. Append-only. |
| `lcs.mid_sequence_state` | STAGING | MID delivery sequence state. Append-only. |
| `lcs.v_latest_by_company` | VIEW | Latest events per company |
| `lcs.v_latest_by_entity` | VIEW | Latest events per entity |
| `lcs.v_company_intelligence` | VIEW | Company intelligence aggregation |

### ctb / doctrine schemas

| Table | Purpose |
|-------|---------|
| `ctb.table_registry` | Registry-first enforcement |
| `doctrine.doctrine_library` | Vectorized doctrine content (668 chunks) |
| `doctrine.doctrine_key` | Doctrine key index |
| `doctrine.doctrine_library_error` | Doctrine ingestion errors |

### Archive Strategy

Every core cl table has a `_archive` counterpart with `archived_at` and `archived_reason` columns.

## Operational Patterns

### Lifecycle State Machine

```
company_candidate (staging)
    |  pending -> verified -> minted (or failed)
    v
company_identity (sovereign registry)
    |  identity_status: PENDING -> PASS / FAIL
    |  eligibility_status: ELIGIBLE / excluded
    |  final_outcome: PASS / FAIL
    |
    |-- Write-once pointers (trigger-enforced):
    |   outreach_id -> outreach_attached_at
    |   sales_process_id -> sales_opened_at
    |   client_id -> client_promoted_at
    v
Downstream hubs (Outreach, Sales, Client)
```

### Identity Minting Flow

1. Data lands in `cl.company_candidate` with `status = 'pending'`
2. Verification pipeline processes: validates domain, name, LinkedIn, state
3. On pass: `status = 'verified'` then `status = 'minted'`, row created in `cl.company_identity`
4. Confidence scores computed in `cl.identity_confidence`
5. External IDs mapped via `cl.company_identity_bridge`

### LCS Pipeline (CID -> SID -> MID -> CET)

1. **CID Compiler**: reads signal_queue + frame_registry, mints `communication_id`, writes `lcs.cid`
2. **SID Worker**: reads compiled CIDs + doctrine, constructs message content, writes `lcs.sid_output`
3. **MID Engine**: reads constructed SIDs + adapters, sequences delivery, writes `lcs.mid_sequence_state`
4. **CET**: writes final event record to `lcs.event`

All pipeline tables are append-only (UPDATE/DELETE blocked by triggers).

### Signal Queue

Signals enter `lcs.signal_queue` with PENDING status. CID compiler picks them up,
binds frame + company intelligence, and produces compiled communication records.

### Neon Agent CLI

```bash
neon-agent migrate [--dry-run] [--target <version>] [--rollback]
neon-agent audit [--schema cl|outreach|sales|client] [--full] [--counts-only]
neon-agent gate [--stage cl-to-outreach|outreach-to-sales|sales-to-client] [--company <id>] [--summary]
neon-agent promote [--from <stage>] [--to <stage>] [--batch <size>] [--dry-run] [--company <id>]
neon-agent health [--connection] [--schemas] [--gates]
neon-agent sync [--dry-run] [--force]
```

### Key Constraints

| Constraint | Enforcement |
|-----------|-------------|
| Admission gate | `company_domain IS NOT NULL OR linkedin_company_url IS NOT NULL` |
| Identity status | `IN ('PENDING', 'PASS', 'FAIL')` |
| State code | `NULL OR ^[A-Z]{2}$` |
| Write-once pointers | Trigger: `cl.enforce_write_once_pointers()` |
| Fingerprint uniqueness | Unique index on `company_fingerprint` |
| Pipeline immutability | Triggers block UPDATE/DELETE on lcs.cid, lcs.sid_output, lcs.mid_sequence_state |

## Known Issues

- Database name contains a space ("Marketing DB") -- requires URL encoding (`Marketing%20DB`) in connection strings
- Shared database with Barton Outreach Core -- schema isolation via `cl.*` and `lcs.*` prefixes
- No foreign keys between tables -- all references are by-value (intentional, per doctrine)
- Pool max is 10 connections in neon-agent -- sufficient for CLI operations but not for high-concurrency

## Cost Profile

| Item | Value |
|------|-------|
| Plan | Neon (shared with barton-outreach-core) |
| Region | us-east-1 (AWS) |
| Endpoint | Pooled (`-pooler` suffix) |
| Storage | 106K+ identity rows + LCS pipeline + doctrine library |
| Compute | Scale-to-zero when idle |
| Driver cost | `pg` is free (npm) |
