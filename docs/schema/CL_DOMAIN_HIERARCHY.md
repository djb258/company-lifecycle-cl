# cl.domain_hierarchy — Schema Documentation

> **Source of Truth:** Neon PostgreSQL
> **Verification Mode:** Read-Only
> **Verification Date:** 2026-01-25

---

## 1. Table Overview

| Field | Value |
|-------|-------|
| **Schema** | cl |
| **Table** | domain_hierarchy |
| **Type** | Core |
| **Total Columns** | 12 |

The `cl.domain_hierarchy` table tracks parent-child relationships between companies based on domain ownership patterns (subsidiaries, acquisitions, brand families).

---

## 2. Column Dictionary

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `hierarchy_id` | uuid | NO | gen_random_uuid() | Primary key |
| `parent_company_id` | uuid | YES | - | Parent company (null = root) |
| `child_company_id` | uuid | NO | - | Child company |
| `domain` | text | NO | - | Domain establishing relationship |
| `hierarchy_type` | text | YES | - | subsidiary, acquisition, brand |
| `relationship_confidence` | integer | YES | - | Confidence score (0-100) |
| `evidence` | jsonb | YES | - | Proof of relationship |
| `created_at` | timestamptz | YES | now() | Record creation |
| `updated_at` | timestamptz | YES | now() | Last update |
| `verified` | boolean | YES | false | Human verified? |
| `verified_at` | timestamptz | YES | - | Verification timestamp |
| `verified_by` | text | YES | - | Verifier identity |

---

## 3. Constraints

### Primary Key
- `hierarchy_id`

### Unique Constraints
- `(domain, child_company_id)` - Each child can have one relationship per domain

---

## 4. Relationships

```
cl.company_identity (parent)
         │
         ├──── (N) cl.domain_hierarchy
         │              │
         └──────────────┴──── cl.company_identity (child)
```

Self-referential through company_identity. A company can be both a parent and a child in different relationships.

---

## 5. Hierarchy Types

| Type | Description | Example |
|------|-------------|---------|
| `subsidiary` | Fully owned subsidiary | Google → YouTube |
| `acquisition` | Acquired company | Microsoft → LinkedIn |
| `brand` | Brand/product line | P&G → Tide |
| `division` | Business division | Alphabet → Google |

---

## 6. Usage Patterns

### Get all subsidiaries of a company
```sql
SELECT
  ci.company_name,
  dh.hierarchy_type,
  dh.relationship_confidence
FROM cl.domain_hierarchy dh
JOIN cl.company_identity ci ON ci.company_unique_id = dh.child_company_id
WHERE dh.parent_company_id = $1
ORDER BY dh.hierarchy_type, ci.company_name;
```

### Get parent company
```sql
SELECT
  ci.company_name,
  dh.hierarchy_type
FROM cl.domain_hierarchy dh
JOIN cl.company_identity ci ON ci.company_unique_id = dh.parent_company_id
WHERE dh.child_company_id = $1;
```

### Find unverified relationships
```sql
SELECT
  parent.company_name AS parent,
  child.company_name AS child,
  dh.hierarchy_type,
  dh.relationship_confidence
FROM cl.domain_hierarchy dh
JOIN cl.company_identity parent ON parent.company_unique_id = dh.parent_company_id
JOIN cl.company_identity child ON child.company_unique_id = dh.child_company_id
WHERE dh.verified = false
ORDER BY dh.relationship_confidence DESC;
```

---

## 7. Archive Table

`cl.domain_hierarchy_archive` mirrors this structure with additional:
- `archived_at` (timestamptz)
- `archived_reason` (text)

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-01-25 |
| Status | Active |
