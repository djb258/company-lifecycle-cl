# cl.identity_confidence — Schema Documentation

> **Source of Truth:** Neon PostgreSQL
> **Verification Mode:** Read-Only
> **Verification Date:** 2026-01-25

---

## 1. Table Overview

| Field | Value |
|-------|-------|
| **Schema** | cl |
| **Table** | identity_confidence |
| **Type** | Core |
| **Total Columns** | 18 |

The `cl.identity_confidence` table stores multi-dimensional confidence scores for company identity verification. Each company has exactly one confidence record (1:1 relationship).

---

## 2. Column Dictionary

### Identity Column

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `company_unique_id` | uuid | NO | - | PK + FK to company_identity |

### Confidence Scores (0-100)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `name_confidence_score` | integer | YES | - | Name verification confidence |
| `domain_confidence_score` | integer | YES | - | Domain verification confidence |
| `linkedin_confidence_score` | integer | YES | - | LinkedIn verification confidence |
| `state_confidence_score` | integer | YES | - | State/incorporation confidence |
| `overall_confidence_score` | integer | YES | - | Weighted aggregate score |
| `confidence_level` | text | YES | - | HIGH / MEDIUM / LOW |

### Verification Status

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `name_verification_status` | text | YES | - | verified / pending / failed |
| `domain_verification_status` | text | YES | - | verified / pending / failed |
| `linkedin_verification_status` | text | YES | - | verified / pending / failed |
| `state_verification_status` | text | YES | - | verified / pending / failed |

### Evidence (JSONB)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `name_evidence` | jsonb | YES | - | Name verification evidence |
| `domain_evidence` | jsonb | YES | - | Domain verification evidence |
| `linkedin_evidence` | jsonb | YES | - | LinkedIn verification evidence |
| `state_evidence` | jsonb | YES | - | State verification evidence |

### Metadata

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `last_calculated_at` | timestamptz | YES | now() | Last score calculation |
| `calculation_method` | text | YES | - | Scoring algorithm version |
| `created_at` | timestamptz | YES | now() | Record creation |
| `updated_at` | timestamptz | YES | now() | Last update |

---

## 3. Constraints

### Primary Key
- `company_unique_id` (also serves as FK)

### Foreign Keys
| Column | References |
|--------|------------|
| `company_unique_id` | `cl.company_identity(company_unique_id)` |

---

## 4. Relationships

```
cl.company_identity (1) ←──── (1) cl.identity_confidence
```

One-to-one relationship. Each company has exactly one confidence record.

---

## 5. Confidence Level Calculation

| Level | Score Range | Meaning |
|-------|-------------|---------|
| HIGH | 80-100 | All verification dimensions passed |
| MEDIUM | 50-79 | Partial verification, some gaps |
| LOW | 0-49 | Significant verification issues |

### Score Weights (typical)
- Name: 25%
- Domain: 30%
- LinkedIn: 25%
- State: 20%

---

## 6. Usage Patterns

### Get confidence for a company
```sql
SELECT
  overall_confidence_score,
  confidence_level,
  name_confidence_score,
  domain_confidence_score,
  linkedin_confidence_score
FROM cl.identity_confidence
WHERE company_unique_id = $1;
```

### Find low-confidence companies
```sql
SELECT ci.company_name, ic.overall_confidence_score, ic.confidence_level
FROM cl.company_identity ci
JOIN cl.identity_confidence ic USING (company_unique_id)
WHERE ic.confidence_level = 'LOW'
ORDER BY ic.overall_confidence_score;
```

### Companies needing re-verification
```sql
SELECT ci.company_name, ic.*
FROM cl.company_identity ci
JOIN cl.identity_confidence ic USING (company_unique_id)
WHERE ic.last_calculated_at < now() - interval '90 days'
ORDER BY ic.last_calculated_at;
```

---

## 7. Archive Table

`cl.identity_confidence_archive` mirrors this structure with additional:
- `archived_at` (timestamptz)
- `archived_reason` (text)

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-01-25 |
| Status | Active |
