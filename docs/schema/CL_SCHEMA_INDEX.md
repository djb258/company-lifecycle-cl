# CL Schema Documentation Index

> **Source of Truth:** Neon PostgreSQL
> **Last Updated:** 2026-02-04
> **Schema Statistics:** 21 tables (cl) + 5 tables (lcs) | 275+ columns | 44 constraints | 3 FKs | 106,086 active records

---

## Quick Navigation

### Core Tables
| Document | Table | Description |
|----------|-------|-------------|
| [CL_COMPANY_IDENTITY.md](CL_COMPANY_IDENTITY.md) | `company_identity` | Master company registry (106,065 rows) |
| [CL_COMPANY_NAMES.md](CL_COMPANY_NAMES.md) | `company_names` | Company name variants |
| [CL_COMPANY_DOMAINS.md](CL_COMPANY_DOMAINS.md) | `company_domains` | Domain records with DNS/SSL |
| [CL_IDENTITY_CONFIDENCE.md](CL_IDENTITY_CONFIDENCE.md) | `identity_confidence` | Confidence scoring |
| [CL_DOMAIN_HIERARCHY.md](CL_DOMAIN_HIERARCHY.md) | `domain_hierarchy` | Parent-child relationships |
| [CL_COMPANY_IDENTITY_BRIDGE.md](CL_COMPANY_IDENTITY_BRIDGE.md) | `company_identity_bridge` | External ID mapping |

### Staging Tables
| Document | Table | Description |
|----------|-------|-------------|
| [CL_COMPANY_CANDIDATE.md](CL_COMPANY_CANDIDATE.md) | `company_candidate` | Ingestion staging |

### Error & Audit Tables
| Document | Tables | Description |
|----------|--------|-------------|
| [CL_ERROR_TABLES.md](CL_ERROR_TABLES.md) | `cl_errors`, `cl_err_existence`, `identity_gate_audit`, `identity_gate_failures` | Error tracking and audit |

### Views
| Document | Views | Description |
|----------|-------|-------------|
| [CL_VIEWS.md](CL_VIEWS.md) | `v_company_identity_eligible`, `v_company_lifecycle_status`, `v_company_promotable`, `v_identity_gate_summary` | Query helpers |

### System Tables (LCS — Lifecycle Communication Spine)
| Document | Tables / Views | Description |
|----------|----------------|-------------|
| [LCS_DATA_MODEL.md](../../src/sys/lcs/doctrine/LCS_DATA_MODEL.md) | `lcs.event`, `lcs.err0`, `lcs.adapter_registry`, `lcs.frame_registry`, `lcs.signal_registry`, `lcs.v_latest_by_company`, `lcs.v_latest_by_entity` | Communication event ledger (DRAFT v0.1.0) |

### ERD
| Document | Description |
|----------|-------------|
| [../CL_SCHEMA_ERD.md](../CL_SCHEMA_ERD.md) | Visual entity relationship diagram |

---

## Schema Patterns

### 1. Archive Strategy
Every core table has a `_archive` counterpart:
- `company_identity_archive`
- `company_names_archive`
- `company_domains_archive`
- `identity_confidence_archive`
- `domain_hierarchy_archive`
- `cl_errors_archive`

Archive tables add:
- `archived_at` (timestamptz)
- `archived_reason` (text)

### 2. Audit Trail
All tables include:
- `created_at` / `updated_at` timestamps
- JSONB evidence fields for verification
- Run IDs for batch tracking

### 3. Foreign Key Hierarchy

```
                    company_identity
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
   company_names    company_domains   identity_confidence
```

### 4. Confidence Scoring
Multi-dimensional scoring (0-100):
- `name_confidence_score`
- `domain_confidence_score`
- `linkedin_confidence_score`
- `state_confidence_score`
- `overall_confidence_score` (weighted aggregate)

Levels: HIGH (80+), MEDIUM (50-79), LOW (0-49)

---

## Common Queries

### Get company with all details
```sql
SELECT
  ci.company_unique_id,
  cn.name_value AS primary_name,
  cd.domain AS primary_domain,
  ci.linkedin_company_url,
  ic.overall_confidence_score,
  ic.confidence_level
FROM cl.company_identity ci
LEFT JOIN cl.company_names cn ON cn.company_unique_id = ci.company_unique_id AND cn.is_primary = true
LEFT JOIN cl.company_domains cd ON cd.company_unique_id = ci.company_unique_id AND cd.is_primary = true
LEFT JOIN cl.identity_confidence ic ON ic.company_unique_id = ci.company_unique_id
WHERE ci.company_unique_id = $1;
```

### Find companies needing attention
```sql
SELECT
  ci.company_unique_id,
  cn.name_value,
  ic.overall_confidence_score,
  ce.failure_reason_code
FROM cl.company_identity ci
JOIN cl.company_names cn ON cn.company_unique_id = ci.company_unique_id AND cn.is_primary = true
LEFT JOIN cl.identity_confidence ic ON ic.company_unique_id = ci.company_unique_id
LEFT JOIN cl.cl_errors ce ON ce.company_unique_id = ci.company_unique_id AND ce.resolved_at IS NULL
WHERE ic.confidence_level = 'LOW'
   OR ce.error_id IS NOT NULL
ORDER BY ic.overall_confidence_score NULLS FIRST;
```

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-01-25 |
| Updated | 2026-02-07 |
| Status | Active |
| Maintainer | System |
| Last Intake | Manual Outreach Batch (+21 records, 2026-02-07) |
