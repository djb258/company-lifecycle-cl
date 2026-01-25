# CL Views — Schema Documentation

> **Source of Truth:** Neon PostgreSQL
> **Verification Mode:** Read-Only
> **Verification Date:** 2026-01-25

---

## Overview

The CL schema includes 4 views for common query patterns:

| View | Purpose |
|------|---------|
| `v_company_identity_eligible` | Companies eligible for identity verification |
| `v_company_lifecycle_status` | Current lifecycle status with key attributes |
| `v_company_promotable` | Companies that can be promoted in lifecycle |
| `v_identity_gate_summary` | Summary of identity gate audit results |

---

## 1. v_company_identity_eligible

Shows companies that are eligible for identity verification based on data completeness.

### Columns

| Column | Type | Description |
|--------|------|-------------|
| `company_unique_id` | uuid | Company ID |
| `lifecycle_status` | text | Current status |
| `has_name` | bigint | Count of names (0 or 1+) |
| `has_domain` | bigint | Count of domains (0 or 1+) |
| `has_linkedin` | bigint | Has LinkedIn? (0 or 1) |
| `name_confidence_score` | integer | Name confidence |
| `domain_confidence_score` | integer | Domain confidence |
| `linkedin_confidence_score` | integer | LinkedIn confidence |
| `overall_confidence_score` | integer | Overall confidence |
| `confidence_level` | text | HIGH / MEDIUM / LOW |
| `is_eligible` | boolean | Meets eligibility criteria |

### Usage

```sql
-- Get all eligible companies
SELECT company_unique_id, overall_confidence_score
FROM cl.v_company_identity_eligible
WHERE is_eligible = true
ORDER BY overall_confidence_score DESC;

-- Count eligible vs ineligible
SELECT is_eligible, COUNT(*)
FROM cl.v_company_identity_eligible
GROUP BY is_eligible;
```

---

## 2. v_company_lifecycle_status

Denormalized view showing company lifecycle status with primary name and domain.

### Columns

| Column | Type | Description |
|--------|------|-------------|
| `company_unique_id` | uuid | Company ID |
| `lifecycle_status` | text | Current status |
| `company_sov_id` | uuid | Sovereign ID |
| `created_at` | timestamptz | Record creation |
| `updated_at` | timestamptz | Last update |
| `primary_name` | text | Primary company name |
| `primary_domain` | text | Primary domain |
| `overall_confidence_score` | integer | Overall confidence |
| `confidence_level` | text | HIGH / MEDIUM / LOW |

### Usage

```sql
-- Get all companies with status
SELECT
  primary_name,
  primary_domain,
  lifecycle_status,
  confidence_level
FROM cl.v_company_lifecycle_status
ORDER BY primary_name;

-- Find companies by status
SELECT *
FROM cl.v_company_lifecycle_status
WHERE lifecycle_status = 'verified'
  AND confidence_level = 'HIGH';
```

---

## 3. v_company_promotable

Shows companies that meet criteria for promotion to next lifecycle stage.

### Columns

| Column | Type | Description |
|--------|------|-------------|
| `company_unique_id` | uuid | Company ID |
| `lifecycle_status` | text | Current status |
| `overall_confidence_score` | integer | Overall confidence |
| `confidence_level` | text | HIGH / MEDIUM / LOW |
| `has_name` | bigint | Has name? |
| `has_domain` | bigint | Has domain? |
| `has_linkedin` | bigint | Has LinkedIn? |
| `name_confidence_score` | integer | Name confidence |
| `domain_confidence_score` | integer | Domain confidence |
| `linkedin_confidence_score` | integer | LinkedIn confidence |
| `can_promote` | boolean | Meets promotion criteria |

### Promotion Criteria

Companies can be promoted when:
- `overall_confidence_score >= 70`
- `has_name > 0` AND (`has_domain > 0` OR `has_linkedin > 0`)
- No blocking errors in `cl_errors`

### Usage

```sql
-- Get promotable companies
SELECT company_unique_id, lifecycle_status, overall_confidence_score
FROM cl.v_company_promotable
WHERE can_promote = true
ORDER BY overall_confidence_score DESC;

-- Count by current status
SELECT lifecycle_status, COUNT(*), SUM(can_promote::int) AS promotable
FROM cl.v_company_promotable
GROUP BY lifecycle_status;
```

---

## 4. v_identity_gate_summary

Aggregates identity gate audit results per company.

### Columns

| Column | Type | Description |
|--------|------|-------------|
| `company_unique_id` | uuid | Company ID |
| `total_runs` | bigint | Total gate runs |
| `latest_run_id` | text | Most recent run ID |
| `latest_result` | text | Most recent result |
| `latest_run_date` | timestamptz | Most recent run date |
| `total_failures` | bigint | Count of failures |
| `unique_failure_types` | bigint | Distinct failure types |

### Usage

```sql
-- Get companies with recent failures
SELECT *
FROM cl.v_identity_gate_summary
WHERE latest_result = 'FAIL'
ORDER BY latest_run_date DESC;

-- Companies with repeated failures
SELECT *
FROM cl.v_identity_gate_summary
WHERE total_failures > 3
ORDER BY total_failures DESC;

-- Success rate by company
SELECT
  company_unique_id,
  total_runs,
  total_failures,
  ROUND(100.0 * (total_runs - total_failures) / total_runs, 1) AS success_rate
FROM cl.v_identity_gate_summary
WHERE total_runs > 0
ORDER BY success_rate;
```

---

## Performance Notes

These views join multiple tables and should be used with appropriate filters:

| View | Underlying Tables | Performance |
|------|-------------------|-------------|
| `v_company_identity_eligible` | company_identity, company_names, company_domains, identity_confidence | Medium - use LIMIT |
| `v_company_lifecycle_status` | company_identity, company_names, company_domains, identity_confidence | Medium - filter by status |
| `v_company_promotable` | Same as eligible | Medium - use LIMIT |
| `v_identity_gate_summary` | identity_gate_audit, identity_gate_failures | Heavy - aggregation |

For large datasets, consider filtering by `company_unique_id` or using `LIMIT` clauses.

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-01-25 |
| Status | Active |
