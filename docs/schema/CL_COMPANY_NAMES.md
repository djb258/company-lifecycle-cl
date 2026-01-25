# cl.company_names — Schema Documentation

> **Source of Truth:** Neon PostgreSQL
> **Verification Mode:** Read-Only
> **Verification Date:** 2026-01-25

---

## 1. Table Overview

| Field | Value |
|-------|-------|
| **Schema** | cl |
| **Table** | company_names |
| **Type** | Core |
| **Total Columns** | 13 |

The `cl.company_names` table stores multiple names for each company (legal names, trade names, DBA names, etc.). A company can have many names but only one marked as primary.

---

## 2. Column Dictionary

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `name_id` | uuid | NO | gen_random_uuid() | Primary key |
| `company_unique_id` | uuid | NO | - | FK to company_identity |
| `name_value` | text | NO | - | The actual company name |
| `name_type` | text | NO | 'legal' | Type: legal, trade, dba, brand |
| `is_primary` | boolean | YES | false | Is this the primary name? |
| `language` | text | YES | 'en' | ISO language code |
| `verified` | boolean | YES | false | Has name been verified? |
| `verification_date` | timestamptz | YES | - | When verified |
| `verification_source` | text | YES | - | Source of verification |
| `created_at` | timestamptz | YES | now() | Record creation |
| `updated_at` | timestamptz | YES | now() | Last update |
| `created_by` | text | YES | - | User/system that created |
| `metadata` | jsonb | YES | - | Additional metadata |

---

## 3. Constraints

### Primary Key
- `name_id`

### Unique Constraints
- `(company_unique_id, name_value, name_type)` - Prevents duplicate name+type combinations per company

### Foreign Keys
| Column | References |
|--------|------------|
| `company_unique_id` | `cl.company_identity(company_unique_id)` |

---

## 4. Relationships

```
cl.company_identity (1) ←──── (N) cl.company_names
```

Each company can have multiple names. The `is_primary = true` name is the canonical display name.

---

## 5. Usage Patterns

### Get primary name for a company
```sql
SELECT name_value
FROM cl.company_names
WHERE company_unique_id = $1
  AND is_primary = true;
```

### Get all names for a company
```sql
SELECT name_value, name_type, is_primary
FROM cl.company_names
WHERE company_unique_id = $1
ORDER BY is_primary DESC, name_type;
```

### Insert a new name
```sql
INSERT INTO cl.company_names (company_unique_id, name_value, name_type, is_primary)
VALUES ($1, $2, $3, $4)
ON CONFLICT (company_unique_id, name_value, name_type) DO NOTHING;
```

---

## 6. Archive Table

`cl.company_names_archive` mirrors this structure with additional:
- `archived_at` (timestamptz)
- `archived_reason` (text)

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-01-25 |
| Status | Active |
