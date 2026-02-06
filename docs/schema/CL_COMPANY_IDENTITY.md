# cl.company_identity — Schema Documentation

> **Source of Truth:** Neon PostgreSQL
> **Verification Mode:** Read-Only
> **Verification Date:** 2026-02-04
> **Row Count:** 106,065

---

## 1. Table Overview

| Field | Value |
|-------|-------|
| **Schema** | cl |
| **Table** | company_identity |
| **Status** | Doctrine-Locked |
| **Total Columns** | 32 |
| **Total Rows** | 106,065 |

The `cl.company_identity` table is the **sovereign identity registry** for companies within the Company Lifecycle (CL) system. Each row represents a formally admitted company that has passed through verification, eligibility assessment, and can progress through the sales funnel.

---

## 2. Column Dictionary (32 Columns — Verified from Neon)

### Core Identity Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `company_unique_id` | uuid | NO | gen_random_uuid() | Primary key, sovereign identifier |
| `company_name` | text | NO | - | Company name from source system |
| `company_domain` | text | YES | - | Company website domain |
| `linkedin_company_url` | text | YES | - | LinkedIn company profile URL |
| `source_system` | text | NO | - | Origin system (clay_import, clay, etc.) |
| `created_at` | timestamptz | NO | now() | Record creation timestamp |
| `company_fingerprint` | text | YES | - | Unique composite (domain + LinkedIn) |

### Verification Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `existence_verified` | boolean | YES | false | Company existence verified |
| `verification_run_id` | text | YES | - | Verification run ID |
| `verified_at` | timestamptz | YES | - | Verification completion time |
| `domain_status_code` | integer | YES | - | HTTP status from domain check |
| `name_match_score` | integer | YES | - | Name match quality (0-100) |
| `state_match_result` | text | YES | - | State verification result |
| `canonical_name` | text | YES | - | Normalized company name |
| `state_verified` | text | YES | - | State verification status |

### Identity Pass Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `identity_pass` | integer | YES | 0 | Number of identity passes |
| `identity_status` | text | YES | 'PENDING' | PENDING / PASS / FAIL |
| `last_pass_at` | timestamptz | YES | - | Last pass timestamp |
| `lifecycle_run_id` | text | YES | - | Lifecycle processing run ID |

### Eligibility Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `eligibility_status` | text | YES | - | ELIGIBLE or exclusion status |
| `exclusion_reason` | text | YES | - | Reason if not eligible |
| `final_outcome` | text | YES | - | PASS or FAIL |
| `final_reason` | text | YES | - | Explanation for outcome |

### Entity Hierarchy Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `entity_role` | text | YES | - | PARENT_ANCHOR / CHILD_OPERATING_UNIT |
| `sovereign_company_id` | uuid | YES | - | Reference to parent company |
| `employee_count_band` | text | YES | - | Employee size range |

### Lifecycle Pointer Columns (Write-Once)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `outreach_id` | uuid | YES | - | **Write-once** pointer to Outreach |
| `sales_process_id` | uuid | YES | - | **Write-once** pointer to Sales |
| `client_id` | uuid | YES | - | **Write-once** pointer to Client |
| `outreach_attached_at` | timestamptz | YES | - | Auto-set when outreach_id written |
| `sales_opened_at` | timestamptz | YES | - | Auto-set when sales_process_id written |
| `client_promoted_at` | timestamptz | YES | - | Auto-set when client_id written |

---

## 3. Constraints

### Primary Key

| Constraint | Column |
|------------|--------|
| `company_identity_pkey` | company_unique_id |

### Check Constraints

| Constraint | Definition | Purpose |
|------------|------------|---------|
| `cl_identity_admission_gate` | `company_domain IS NOT NULL OR linkedin_company_url IS NOT NULL` | At least one identity anchor required |
| `cl_identity_status_check` | `identity_status IN ('PENDING', 'PASS', 'FAIL')` | Valid status values |
| `company_identity_final_outcome_check` | `final_outcome IN ('PASS', 'FAIL')` | Valid outcome values |

---

## 4. Indexes

| Index | Column(s) | Unique | Purpose |
|-------|-----------|--------|---------|
| `company_identity_pkey` | company_unique_id | YES | Primary key |
| `idx_company_identity_fingerprint_unique` | company_fingerprint | YES | Deduplication |
| `idx_cl_company_domain` | company_domain | NO | Domain lookups |
| `idx_cl_company_linkedin` | linkedin_company_url | NO | LinkedIn lookups |
| `idx_cl_identity_existence` | existence_verified | NO | Verification filter |
| `idx_cl_identity_pass` | identity_pass | NO | Pass count filter |
| `idx_cl_identity_status` | identity_status | NO | Status filter |
| `idx_company_identity_outreach_id` | outreach_id | NO | Outreach lookups |
| `idx_company_identity_sales_process_id` | sales_process_id | NO | Sales lookups |
| `idx_company_identity_client_id` | client_id | NO | Client lookups |

---

## 5. Trigger: Write-Once Enforcement

**Trigger:** `trg_write_once_pointers`
**Event:** BEFORE UPDATE
**Function:** `cl.enforce_write_once_pointers()`

```sql
-- Enforces write-once semantics for lifecycle pointers
-- Auto-sets timestamps on first write

IF OLD.outreach_id IS NOT NULL AND NEW.outreach_id IS DISTINCT FROM OLD.outreach_id THEN
  RAISE EXCEPTION 'outreach_id is write-once and already set';
END IF;

-- Same for sales_process_id and client_id

-- Auto-timestamp on first write
IF OLD.outreach_id IS NULL AND NEW.outreach_id IS NOT NULL THEN
  NEW.outreach_attached_at := NOW();
END IF;
```

---

## 6. Data Distribution (Current State)

| Metric | Value |
|--------|-------|
| Total Records | 106,065 |
| Final Outcome = PASS | 106,065 (100%) |
| Identity Status = PASS | ~105,303 (99.28%) |
| Identity Status = FAIL | ~762 (0.72%) |
| Eligibility = ELIGIBLE | 106,065 (100%) |
| Entity Role = PARENT_ANCHOR | ~101,341 (95.55%) |
| Entity Role = CHILD_OPERATING_UNIT | ~4,724 (4.45%) |
| Outreach Attached | 0 (0%) |

### Source System Breakdown

| Source System | Count | % of Total |
|---------------|-------|------------|
| hunter_dol_enrichment | 54,155 | 51.06% |
| clay_import | ~30,000 | ~28.29% |
| CLAY_MULTI_* | ~21,910 | ~20.65% |

---

## 7. Immutability Rules

### Immutable Columns (NEVER change after insert)

| Column | Immutability |
|--------|--------------|
| `company_unique_id` | IMMUTABLE — permanent sovereign ID |
| `created_at` | IMMUTABLE — minting timestamp |
| `source_system` | IMMUTABLE — origin provenance |

### Write-Once Columns (Set once, then locked)

| Column | Enforcement |
|--------|-------------|
| `outreach_id` | Trigger-enforced write-once |
| `sales_process_id` | Trigger-enforced write-once |
| `client_id` | Trigger-enforced write-once |

### Correctable Columns (May be updated with audit)

| Column | Mutability |
|--------|------------|
| `company_name` | Correctable |
| `company_domain` | Correctable |
| `linkedin_company_url` | Correctable |
| `canonical_name` | Correctable |

---

## 8. AI Usage Notes

### Correct Query Patterns

```sql
-- Lookup by domain
SELECT company_unique_id, company_name
FROM cl.company_identity
WHERE company_domain = 'example.com';

-- Lookup by LinkedIn
SELECT company_unique_id, company_name
FROM cl.company_identity
WHERE linkedin_company_url LIKE '%linkedin.com/company/example%';

-- Get eligible companies not yet in outreach
SELECT company_unique_id, company_name, company_domain
FROM cl.company_identity
WHERE final_outcome = 'PASS'
  AND outreach_id IS NULL;
```

### Anti-Patterns (Do NOT Do These)

| Anti-Pattern | Why Wrong |
|--------------|-----------|
| Generate your own UUID | Violates sovereign minting |
| Query without identity anchor | Full table scan |
| Use company_name as identifier | Names are not unique |
| Update write-once columns | Trigger will reject |

---

## 9. SQL Comments

```sql
COMMENT ON TABLE cl.company_identity IS
'Sovereign identity registry for Company Lifecycle. 32 columns tracking identity, verification, eligibility, and funnel progression. Write-once pattern for lifecycle pointers.';

COMMENT ON COLUMN cl.company_identity.company_unique_id IS
'Sovereign, immutable UUID. Auto-generated. NEVER reuse.';

COMMENT ON COLUMN cl.company_identity.outreach_id IS
'Write-once pointer to Outreach hub. Trigger-enforced immutability after first write.';
```

---

## 10. Document Control

| Field | Value |
|-------|-------|
| **Source of Truth** | Neon PostgreSQL |
| **Verification Mode** | Read-Only |
| **Verification Date** | 2026-02-04 |
| **Column Count** | 32 |
| **Row Count** | 106,065 |
| **Documentation Version** | 2.1 |
| **Previous Version** | 2.0 (51,910 rows) |

---

> **VERIFICATION STAMP**
> Row count updated 2026-02-04 after Hunter DOL enrichment intake (+54,155 records).
> Schema structure verified against `information_schema.columns` on 2026-01-25.
> Constraints verified against `information_schema.table_constraints`.
> Trigger verified against `information_schema.triggers`.
