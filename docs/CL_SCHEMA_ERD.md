# CL Schema ERD
**Generated: 2026-01-22**

## Visual ERD

```
┌─────────────────────────────────────────────────────────────────┐
│                     CL SCHEMA (Company Lifecycle)               │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────┐
  │   company_identity       │  ← MASTER TABLE (51,910 PASS)
  │   ══════════════════     │
  │   company_unique_id [PK] │
  │   sovereign_company_id   │
  │   company_name           │
  │   company_domain         │
  │   linkedin_company_url   │
  │   final_outcome = PASS   │
  │   entity_role            │
  │   eligibility_status     │
  └───────────┬──────────────┘
              │
    ┌─────────┼─────────┬─────────────┐
    │         │         │             │
    ▼         ▼         ▼             ▼
┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐
│company │ │company │ │identity  │ │domain        │
│_names  │ │_domains│ │_confidence│ │_hierarchy    │
│(78,204)│ │(51,910)│ │ (51,910) │ │   (4,705)    │
└────────┘ └────────┘ └──────────┘ └──────────────┘

  ┌──────────────────────────┐
  │ company_identity_archive │  ← ARCHIVED FAIL (22,263)
  │   final_outcome = FAIL   │
  └──────────────────────────┘

  ┌──────────────────────────┐
  │     cl_errors_archive    │  ← ARCHIVED ERRORS (16,103)
  └──────────────────────────┘

  ┌──────────────────────────┐
  │       cl_errors          │  ← WORK QUEUE (0 at steady state)
  └──────────────────────────┘
```

## Tables Summary

| Table | Rows | Purpose |
|-------|------|---------|
| company_identity | 51,910 | Master table - PASS companies only |
| company_identity_archive | 22,263 | Archived FAIL companies |
| company_names | 78,204 | Name variants per company |
| company_domains | 51,910 | Domain records for active companies |
| identity_confidence | 51,910 | Confidence scores |
| domain_hierarchy | 4,705 | Parent-child relationships |
| company_candidate | 62,162 | Intake candidates |
| company_identity_bridge | 71,820 | Source ID → Sovereign ID mapping |
| cl_errors | 0 | Work queue (empty at steady state) |
| cl_errors_archive | 16,103 | Archived error history |
| cl_err_existence | 7,985 | Legacy existence errors |

## Foreign Keys

```
cl.company_domains.company_unique_id → cl.company_identity.company_unique_id
cl.company_names.company_unique_id → cl.company_identity.company_unique_id
cl.identity_confidence.company_unique_id → cl.company_identity.company_unique_id
```

## Views

| View | Rows | Purpose |
|------|------|---------|
| v_company_promotable | 51,910 | Canonical source for Outreach |
| v_company_identity_eligible | 51,910 | Eligible companies |
| v_identity_gate_summary | 1 | Gate audit summary |

---

## Table Details

### cl.company_identity (51,910 rows) - MASTER
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| company_unique_id | uuid | NO | PK |
| sovereign_company_id | uuid | YES | Sovereign ID |
| company_name | text | NO | |
| company_domain | text | YES | |
| linkedin_company_url | text | YES | |
| source_system | text | NO | |
| final_outcome | text | YES | PASS only |
| final_reason | text | YES | ELIGIBLE_VERIFIED |
| entity_role | text | YES | PARENT_ANCHOR / CHILD_OPERATING_UNIT |
| eligibility_status | text | YES | ELIGIBLE |
| existence_verified | boolean | YES | |
| verified_at | timestamptz | YES | |

### cl.company_identity_archive (22,263 rows) - ARCHIVED FAIL
Same structure as company_identity plus:
| Column | Type | Notes |
|--------|------|-------|
| archived_at | timestamptz | When archived |
| archive_reason | text | FAIL_CLEANUP |
| final_outcome | text | FAIL |
| final_reason | text | RESTRICTED_NONPROFIT, EXISTENCE_NOT_VERIFIED, BLOCKED_NO_DOMAIN, EXCLUDED_POLICY, ROLE_UNCERTAIN |

### cl.domain_hierarchy (4,705 rows)
| Column | Type | Notes |
|--------|------|-------|
| hierarchy_id | uuid | PK |
| domain | text | Shared domain |
| parent_company_id | uuid | Parent company |
| child_company_id | uuid | Child company |
| relationship_type | text | CHILD_OPERATING_UNIT, AMBIGUOUS_UNRESOLVED |
| confidence_score | integer | 0-100 |
| resolution_method | text | How determined |

### cl.cl_errors (0 rows) - WORK QUEUE
| Column | Type | Notes |
|--------|------|-------|
| error_id | uuid | PK |
| company_unique_id | uuid | |
| pass_name | text | existence, collision, etc. |
| failure_reason_code | text | |
| final_outcome | text | PASS or FAIL |
| resolved_at | timestamptz | When resolved |

---

## Archive Tables

All archive tables mirror their source tables with additional columns:
- `archived_at` - When the record was archived
- `archive_reason` - Why it was archived

| Archive Table | Rows |
|--------------|------|
| company_identity_archive | 22,263 |
| company_domains_archive | 18,328 |
| company_names_archive | 17,764 |
| identity_confidence_archive | 19,850 |
| domain_hierarchy_archive | 1,878 |
| cl_errors_archive | 16,103 |
