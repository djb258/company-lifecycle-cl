# CL Error & Audit Tables — Schema Documentation

> **Source of Truth:** Neon PostgreSQL
> **Verification Mode:** Read-Only
> **Verification Date:** 2026-01-25

---

## Overview

The CL schema includes several tables for error tracking and audit trails:

| Table | Type | Purpose |
|-------|------|---------|
| `cl_errors` | Error Tracking | Lifecycle processing errors |
| `cl_errors_archive` | Archive | Archived/resolved errors |
| `cl_err_existence` | Error Tracking | Existence verification failures |
| `identity_gate_audit` | Audit | Gate check audit trail |
| `identity_gate_failures` | Audit | Specific gate failures |

---

## 1. cl_errors

General lifecycle processing errors with retry logic.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `error_id` | uuid | NO | gen_random_uuid() | Primary key |
| `company_unique_id` | uuid | YES | - | Related company |
| `lifecycle_run_id` | text | NO | - | Processing run ID |
| `pass_name` | text | NO | - | Which pass failed |
| `failure_reason_code` | text | NO | - | Structured error code |
| `inputs_snapshot` | jsonb | YES | - | Data at time of error |
| `created_at` | timestamptz | YES | now() | Error timestamp |
| `resolved_at` | timestamptz | YES | - | When resolved |
| `retry_count` | integer | YES | 0 | Current retry count |
| `retry_ceiling` | integer | YES | 3 | Max retries |
| `retry_after` | timestamptz | YES | - | Next retry time |
| `tool_used` | text | YES | - | Tool that failed |
| `tool_tier` | integer | YES | - | Tool tier (0-2) |
| `expires_at` | timestamptz | YES | - | Error expiration |
| `final_outcome` | text | YES | - | resolved / abandoned |
| `final_reason` | text | YES | - | Resolution details |

### Constraints
- PK: `error_id`
- Unique: `(company_unique_id, pass_name, failure_reason_code)`

---

## 2. cl_err_existence

Specific errors from existence verification pass.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `error_id` | uuid | NO | gen_random_uuid() | Primary key |
| `company_unique_id` | uuid | NO | - | Related company |
| `company_name` | text | YES | - | Company name |
| `company_domain` | text | YES | - | Domain checked |
| `linkedin_company_url` | text | YES | - | LinkedIn checked |
| `reason_code` | text | NO | - | Error code |
| `domain_status_code` | integer | YES | - | HTTP status |
| `domain_redirect_chain` | text[] | YES | - | Redirect path |
| `domain_final_url` | text | YES | - | Final URL after redirects |
| `domain_error` | text | YES | - | Domain error message |
| `extracted_name` | text | YES | - | Name from website |
| `name_match_score` | integer | YES | - | Match score (0-100) |
| `extracted_state` | text | YES | - | State from website |
| `state_match_result` | text | YES | - | State match result |
| `evidence` | jsonb | YES | - | Full evidence |
| `verification_run_id` | text | NO | - | Run ID |
| `created_at` | timestamptz | YES | now() | Error timestamp |

### Constraints
- PK: `error_id`

---

## 3. identity_gate_audit

Audit trail for identity gate checks.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `audit_id` | uuid | NO | gen_random_uuid() | Primary key |
| `company_unique_id` | uuid | YES | - | Related company |
| `gate_run_id` | text | NO | - | Gate run ID |
| `gate_result` | text | NO | - | PASS / FAIL |
| `gate_checks_performed` | jsonb | YES | - | Checks run |
| `gate_failures` | jsonb | YES | - | Failed checks |
| `gate_metadata` | jsonb | YES | - | Additional context |
| `created_at` | timestamptz | YES | now() | Audit timestamp |

### Constraints
- PK: `audit_id`

---

## 4. identity_gate_failures

Individual gate check failures.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `failure_id` | uuid | NO | gen_random_uuid() | Primary key |
| `company_unique_id` | uuid | YES | - | Related company |
| `gate_run_id` | text | NO | - | Gate run ID |
| `failure_type` | text | NO | - | Type of failure |
| `failure_details` | jsonb | YES | - | Failure specifics |
| `created_at` | timestamptz | YES | now() | Failure timestamp |

### Constraints
- PK: `failure_id`

---

## 5. Common Error Codes

### Pass Names
| Code | Description |
|------|-------------|
| `ADMISSION_GATE` | Initial admission check |
| `EXISTENCE_CHECK` | Company existence verification |
| `IDENTITY_PASS` | Identity verification pass |
| `ELIGIBILITY_CHECK` | Eligibility determination |

### Failure Reason Codes
| Code | Description |
|------|-------------|
| `DOMAIN_UNREACHABLE` | Domain returned error |
| `DOMAIN_REDIRECT_LOOP` | Too many redirects |
| `NAME_MISMATCH` | Name didn't match |
| `STATE_MISMATCH` | State didn't match |
| `LINKEDIN_NOT_FOUND` | LinkedIn page not found |
| `TOOL_TIMEOUT` | External tool timed out |
| `RATE_LIMITED` | Hit rate limit |

---

## 6. Usage Patterns

### Get recent errors for a company
```sql
SELECT
  pass_name,
  failure_reason_code,
  created_at,
  retry_count,
  inputs_snapshot
FROM cl.cl_errors
WHERE company_unique_id = $1
ORDER BY created_at DESC;
```

### Get unresolved retryable errors
```sql
SELECT *
FROM cl.cl_errors
WHERE resolved_at IS NULL
  AND retry_count < retry_ceiling
  AND (retry_after IS NULL OR retry_after < now())
ORDER BY created_at;
```

### Get gate audit summary
```sql
SELECT
  company_unique_id,
  COUNT(*) AS total_runs,
  SUM(CASE WHEN gate_result = 'PASS' THEN 1 ELSE 0 END) AS passes,
  SUM(CASE WHEN gate_result = 'FAIL' THEN 1 ELSE 0 END) AS failures
FROM cl.identity_gate_audit
GROUP BY company_unique_id;
```

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-01-25 |
| Status | Active |
