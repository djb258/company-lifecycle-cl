# cl.company_candidate — Schema Documentation

> **Source of Truth:** Neon PostgreSQL
> **Verification Mode:** Read-Only
> **Verification Date:** 2026-01-25

---

## 1. Table Overview

| Field | Value |
|-------|-------|
| **Schema** | cl |
| **Table** | company_candidate |
| **Type** | Staging |
| **Total Columns** | 13 |

The `cl.company_candidate` table is a staging area for new companies before they are verified and minted into `company_identity`. All ingested companies land here first.

---

## 2. Column Dictionary

### Identity Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `candidate_id` | uuid | NO | gen_random_uuid() | Primary key |
| `company_unique_id` | uuid | YES | - | FK to company_identity (after mint) |
| `source_system` | text | NO | - | Origin system (clay_import, manual, etc.) |
| `source_record_id` | text | NO | - | ID in source system |
| `source_payload` | jsonb | YES | - | Raw data from source |

### Candidate Data

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `candidate_name` | text | YES | - | Company name |
| `candidate_domain` | text | YES | - | Company domain |
| `candidate_linkedin_url` | text | YES | - | LinkedIn URL |
| `candidate_state` | text | YES | - | State of incorporation |

### Processing Status

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `status` | text | NO | 'pending' | pending / verified / failed / minted |
| `validation_result` | jsonb | YES | - | Validation details |
| `validation_score` | integer | YES | - | Validation score (0-100) |
| `processing_attempts` | integer | YES | 0 | Number of processing tries |
| `error_details` | text | YES | - | Error message if failed |

### Timestamps

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `created_at` | timestamptz | YES | now() | When ingested |
| `updated_at` | timestamptz | YES | now() | Last update |
| `processed_at` | timestamptz | YES | - | When processing completed |

---

## 3. Constraints

### Primary Key
- `candidate_id`

### Unique Constraints
- `(source_system, source_record_id)` - Prevents duplicate imports from same source

---

## 4. Status Flow

```
INGESTION                  VERIFICATION                    MINTING
    │                           │                             │
    ▼                           ▼                             ▼
┌─────────┐              ┌───────────┐                 ┌───────────┐
│ pending │──────────────│ verified  │─────────────────│  minted   │
└─────────┘              └───────────┘                 └───────────┘
    │                           │
    │                           ▼
    │                    ┌───────────┐
    └───────────────────▶│  failed   │
                         └───────────┘
```

| Status | Description |
|--------|-------------|
| `pending` | Awaiting verification |
| `verified` | Passed admission gate, ready to mint |
| `failed` | Failed verification (see error_details) |
| `minted` | Identity created in company_identity |

---

## 5. Usage Patterns

### Get pending candidates
```sql
SELECT candidate_id, candidate_name, candidate_domain
FROM cl.company_candidate
WHERE status = 'pending'
ORDER BY created_at
LIMIT 100;
```

### Get failed candidates with errors
```sql
SELECT
  candidate_name,
  candidate_domain,
  error_details,
  processing_attempts
FROM cl.company_candidate
WHERE status = 'failed'
  AND processing_attempts < 3
ORDER BY created_at;
```

### Check for duplicates before insert
```sql
SELECT EXISTS (
  SELECT 1 FROM cl.company_candidate
  WHERE source_system = $1
    AND source_record_id = $2
);
```

### Update candidate after minting
```sql
UPDATE cl.company_candidate
SET
  status = 'minted',
  company_unique_id = $2,
  processed_at = now()
WHERE candidate_id = $1;
```

---

## 6. Integration with Pipeline Scripts

| Script | Action |
|--------|--------|
| `ingest_new_companies.cjs` | Inserts rows with status='pending' |
| `validate_new_companies.cjs` | Validates before ingestion (dry run) |
| `verify_and_mint.cjs` | Processes pending → verified/failed → minted |

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-01-25 |
| Status | Active |
