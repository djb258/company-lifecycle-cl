# cl.company_identity_bridge — Schema Documentation

> **Source of Truth:** Neon PostgreSQL
> **Verification Mode:** Read-Only
> **Verification Date:** 2026-01-25
> **Doctrine Status:** LOCKED

---

## 1. Table Overview

| Field | Value |
|-------|-------|
| **Schema** | cl |
| **Table** | company_identity_bridge |
| **Type** | Core |
| **Total Columns** | 12 |

The `cl.company_identity_bridge` table links internal `company_unique_id` to external System of Value (SoV) IDs. This enables identity resolution across systems while maintaining a single source of truth.

---

## 2. Column Dictionary

### Identity Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `bridge_id` | uuid | NO | gen_random_uuid() | Primary key |
| `company_sov_id` | uuid | NO | - | External sovereign ID |
| `source_company_id` | uuid | NO | - | Company ID in source system |
| `source_system` | text | NO | - | Source system identifier |

### Match Metadata

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `match_confidence_score` | integer | YES | - | Confidence of match (0-100) |
| `match_method` | text | YES | - | How match was determined |
| `match_evidence` | jsonb | YES | - | Evidence supporting match |
| `bridge_status` | text | YES | 'active' | active / inactive / deprecated |

### Audit Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `created_at` | timestamptz | YES | now() | Bridge creation |
| `updated_at` | timestamptz | YES | now() | Last update |
| `created_by` | text | YES | - | Creator |
| `validated_at` | timestamptz | YES | - | When validated |
| `validated_by` | text | YES | - | Validator |

---

## 3. Constraints

### Primary Key
- `bridge_id`

### Unique Constraints
- `company_sov_id` - Each SoV ID can only appear once
- `source_company_id` - Each source company can only be bridged once

---

## 4. Match Methods

| Method | Description |
|--------|-------------|
| `domain_exact` | Exact domain match |
| `linkedin_exact` | Exact LinkedIn URL match |
| `name_domain_combo` | Name + domain combination |
| `fingerprint` | Company fingerprint match |
| `manual` | Human-verified match |

---

## 5. Usage Patterns

### Resolve external ID to internal
```sql
SELECT source_company_id
FROM cl.company_identity_bridge
WHERE company_sov_id = $1
  AND bridge_status = 'active';
```

### Find bridge for a source company
```sql
SELECT company_sov_id, match_confidence_score, match_method
FROM cl.company_identity_bridge
WHERE source_company_id = $1
  AND source_system = $2;
```

### Get all bridges for a system
```sql
SELECT
  source_company_id,
  company_sov_id,
  match_confidence_score
FROM cl.company_identity_bridge
WHERE source_system = $1
  AND bridge_status = 'active'
ORDER BY match_confidence_score DESC;
```

### Create new bridge
```sql
INSERT INTO cl.company_identity_bridge (
  company_sov_id,
  source_company_id,
  source_system,
  match_confidence_score,
  match_method,
  match_evidence,
  created_by
)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (source_company_id) DO UPDATE
SET
  match_confidence_score = EXCLUDED.match_confidence_score,
  match_evidence = EXCLUDED.match_evidence,
  updated_at = now();
```

---

## 6. Integration Points

| System | source_system Value | Description |
|--------|---------------------|-------------|
| Outreach | `outreach` | Outreach CRM |
| Sales | `sales_process` | Sales pipeline |
| Client | `client` | Client management |
| Clay | `clay_import` | Clay enrichment |

---

## 7. Bridge Status Lifecycle

```
┌─────────┐
│  active │ ← Initial state
└────┬────┘
     │
     ▼
┌──────────┐
│ inactive │ ← Temporarily disabled
└────┬─────┘
     │
     ▼
┌────────────┐
│ deprecated │ ← Permanently replaced
└────────────┘
```

---

## 8. DOCTRINE: Inbound Sources

### Authorized Write Systems

| System | Authority | Constraint |
|--------|-----------|------------|
| `verify_and_mint.cjs` | Link existing identity | company_unique_id resolution only |
| `outreach` spoke | Register external ID | Via API, validated |
| `sales_process` spoke | Register external ID | Via API, validated |
| `client` spoke | Register external ID | Via API, validated |

### Explicitly Excluded

| Source | Reason |
|--------|--------|
| Direct SQL inserts (ad-hoc) | No audit trail |
| Bulk imports without run_id | Untracked mutations |
| Any system not listed above | Unauthorized |

**Rule:** All writes MUST include `created_by` and `match_evidence`.

---

## 9. DOCTRINE: Outbound Usage

### Authorized Read Consumers

| Consumer | Purpose | Mutation Authority |
|----------|---------|-------------------|
| Outreach spoke | Resolve company_unique_id | NONE |
| Sales spoke | Resolve company_unique_id | NONE |
| Client spoke | Resolve company_unique_id | NONE |
| Reporting/BI | Analytics | NONE |
| CL pipeline scripts | Duplicate detection | NONE |

**Rule:** Downstream consumers have READ-ONLY access. No consumer may modify bridge records except the originating system.

---

## 10. DOCTRINE: Cardinality Rules

### Enforced Relationships

| Relationship | Cardinality | Enforcement |
|--------------|-------------|-------------|
| `company_identity` → `bridge` | 1:N | One identity may have multiple external IDs |
| `bridge` → external system | N:1 | Multiple bridges may point to same source_system |
| `source_company_id` | 1:1 | UNIQUE constraint - one bridge per source ID |
| `company_sov_id` | 1:1 | UNIQUE constraint - one bridge per SoV ID |

### Prohibited

| Pattern | Reason |
|---------|--------|
| Many-to-many mappings | Ambiguous identity resolution |
| Circular references | Undefined resolution path |
| Null `source_system` | Unattributed bridge |

---

## 11. DOCTRINE: Mutation Constraints

### Bridge Table Responsibilities

| Action | Permitted | Reason |
|--------|-----------|--------|
| Store external identifiers | YES | Core purpose |
| Map external ID to company_unique_id | YES | Core purpose |
| Update match_confidence_score | YES | Refinement allowed |
| Update bridge_status | YES | Lifecycle management |

### Bridge Table Prohibitions

| Action | Permitted | Reason |
|--------|-----------|--------|
| Mint sovereign IDs | NO | Only `verify_and_mint.cjs` mints |
| Modify `cl.company_identity` | NO | Bridge is read-only to canonical |
| Create new companies | NO | Staging → Mint flow only |
| Delete canonical records | NO | Archive pattern required |

**Rule:** Bridge tables store pointers. They do not create, modify, or delete canonical identity records.

---

## 12. DOCTRINE: Failure Modes

### On Conflict Behavior

| Conflict Type | Behavior | Error Location |
|---------------|----------|----------------|
| Duplicate `source_company_id` | UPSERT (update confidence/evidence) | None - handled |
| Duplicate `company_sov_id` | REJECT insert | `cl.cl_errors` |
| Invalid `source_system` | REJECT insert | Application layer |
| Missing `match_evidence` | REJECT insert | Application layer |

### Error Logging

| Error Type | Logged To | Fields |
|------------|-----------|--------|
| Constraint violation | `cl.cl_errors` | `pass_name='BRIDGE_WRITE'`, `failure_reason_code` |
| Validation failure | `cl.cl_errors` | `inputs_snapshot` contains payload |
| Conflict resolution | `cl.identity_gate_audit` | `gate_metadata` contains resolution |

### Recovery

| Failure | Recovery Path |
|---------|---------------|
| Duplicate SoV ID | Manual review, deprecate one bridge |
| Invalid source_system | Reject at application layer, no DB state change |
| Orphaned bridge | Periodic cleanup job, status → deprecated |

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-01-25 |
| Doctrine Locked | 2026-01-25 |
| Status | DOCTRINE LOCKED |
| Drift Risk | LOW |
| Last Verified | 2026-01-25 |
