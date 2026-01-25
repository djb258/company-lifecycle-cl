# Pipeline Scripts Review

> **Review Date:** 2026-01-25
> **Scripts Location:** `company-lifecycle-cl/scripts/`
> **Status:** Operational
> **Doctrine Status:** LOCKED

---

## Executive Summary

Three Node.js scripts manage the company ingestion pipeline:

| Script | Purpose | Status |
|--------|---------|--------|
| `validate_new_companies.cjs` | Pre-flight validation (dry run) | Operational |
| `ingest_new_companies.cjs` | CSV ingestion to staging | Operational |
| `verify_and_mint.cjs` | Verification and identity minting | Operational |

**Pipeline Flow:**
```
CSV File → validate_new_companies.cjs → ingest_new_companies.cjs → verify_and_mint.cjs → company_identity
                (optional)                    (staging)                 (minting)
```

---

## 1. validate_new_companies.cjs

### Purpose
Pre-validates a CSV file before ingestion to identify issues.

### Usage
```bash
doppler run -- node scripts/validate_new_companies.cjs [csv_path]
```

### Logic Flow
1. Read CSV file
2. Validate contract (name + domain OR LinkedIn required)
3. Check domains against existing `cl.company_identity`
4. Check LinkedIn URLs against existing records
5. Report truly new vs duplicate companies

### Key Features
- Non-destructive (read-only)
- Detailed duplicate detection
- Contract validation

### Strengths
- Good separation of concerns
- Clear output formatting
- Proper connection cleanup

### Issues Identified
| Severity | Issue | Location | Recommendation |
|----------|-------|----------|----------------|
| Low | Hardcoded default CSV path | Line 24 | Move to config or require explicit path |
| Low | Sequential duplicate checks | Lines 106-171 | Could batch queries for performance |
| Info | No state validation | - | Add state code validation for multi-state support |

### DOCTRINE: Script Intent Declaration

#### Purpose
Validate CSV data against CL admission contract before ingestion. Report issues without modifying state.

#### Allowed Writes
| Table | Operation | Permitted |
|-------|-----------|-----------|
| (none) | - | NO WRITES |

This script is READ-ONLY. It performs no database mutations.

#### Explicit Non-Responsibilities
| Action | Permitted | Reason |
|--------|-----------|--------|
| Insert into any table | NO | Validation only |
| Update any table | NO | Validation only |
| Delete from any table | NO | Validation only |
| Modify CSV file | NO | Input is immutable |
| Create candidates | NO | Deferred to ingest script |

#### Error Visibility
| Error Type | Visibility |
|------------|------------|
| Contract failures | Console output |
| Duplicate detection | Console output |
| Connection errors | Console error, exit code 1 |

#### Authorized Scope
| Dimension | Constraint |
|-----------|------------|
| Data source | Local CSV file only |
| Database access | SELECT on `cl.company_identity` only |
| Output | Console only (no file writes) |

---

## 2. ingest_new_companies.cjs

### Purpose
Ingests companies from CSV into `cl.company_candidate` staging table.

### Usage
```bash
doppler run -- node scripts/ingest_new_companies.cjs [csv_path] [--dry-run]
```

### Logic Flow
1. Read CSV file
2. Load existing domains and LinkedIn URLs (duplicate prevention)
3. For each row:
   - Validate contract (name + domain OR LinkedIn)
   - Validate state code
   - Check for duplicates
   - Generate source_record_id
   - Insert into company_candidate
4. Report summary by state

### Key Features
- Dry run mode for testing
- State mapping (9 states supported)
- Duplicate prevention within run
- Progress logging every 500 rows

### Database Operations
```sql
INSERT INTO cl.company_candidate (
  source_system,
  source_record_id,
  state_code,
  raw_payload,
  ingestion_run_id,
  verification_status
) VALUES ($1, $2, $3, $4, $5, 'PENDING')
ON CONFLICT (source_system, source_record_id) DO NOTHING
```

### Strengths
- Idempotent (ON CONFLICT DO NOTHING)
- Tracks ingestion run ID for traceability
- Good error handling per row
- Dry run capability

### Issues Identified
| Severity | Issue | Location | Recommendation |
|----------|-------|----------|----------------|
| Medium | Limited state support | Lines 26-36 | Expand STATE_MAP or load from DB |
| Medium | SSL warning on connection | Line 78 | Use `sslmode=verify-full` |
| Low | Memory: loads all existing domains | Lines 97-108 | Consider pagination for very large datasets |
| Low | No transaction wrapper | Lines 177-215 | Wrap batch in transaction for atomicity |

### State Mapping
```javascript
const STATE_MAP = {
  'Delaware': 'DE',
  'Virginia': 'VA',
  'Maryland': 'MD',
  'Pennsylvania': 'PA',
  'Ohio': 'OH',
  'North Carolina': 'NC',
  'Kentucky': 'KY',
  'West Virginia': 'WV',
  'Oklahoma': 'OK',
};
```

### DOCTRINE: Script Intent Declaration

#### Purpose
Ingest validated company records from CSV into staging table for subsequent verification and minting.

#### Allowed Writes
| Table | Operation | Permitted |
|-------|-----------|-----------|
| `cl.company_candidate` | INSERT | YES |
| `cl.company_candidate` | UPDATE | NO |
| `cl.company_candidate` | DELETE | NO |
| All other tables | Any | NO |

#### Explicit Non-Responsibilities
| Action | Permitted | Reason |
|--------|-----------|--------|
| Write to `cl.company_identity` | NO | Minting is verify_and_mint.cjs responsibility |
| Write to `cl.company_names` | NO | Out of scope |
| Write to `cl.company_domains` | NO | Out of scope |
| Write to `cl.identity_confidence` | NO | Out of scope |
| Write to `cl.company_identity_bridge` | NO | Out of scope |
| Verify company existence | NO | Deferred to verify_and_mint.cjs |
| Mint sovereign IDs | NO | Deferred to verify_and_mint.cjs |
| Modify existing candidates | NO | Insert-only pattern |

#### Error Visibility
| Error Type | Visibility |
|------------|------------|
| Contract failures | Console output (skipped count) |
| State mapping failures | Console output (skipped count) |
| Duplicate detection | Console output (skipped count) |
| Database insert errors | Console output (error array) |
| Connection errors | Console error, exit code 1 |

#### Authorized Scope
| Dimension | Constraint |
|-----------|------------|
| Data source | Local CSV file only |
| Geographic scope | 9 states: DE, VA, MD, PA, OH, NC, KY, WV, OK |
| Database writes | `cl.company_candidate` INSERT only |
| Mutation pattern | Idempotent (ON CONFLICT DO NOTHING) |

---

## 3. verify_and_mint.cjs

### Purpose
Processes pending candidates, verifies them, and mints sovereign identities.

### Usage
```bash
doppler run -- node scripts/verify_and_mint.cjs [run_id] [batch_size]
```

### Logic Flow
1. Query PENDING candidates from `cl.company_candidate`
2. For each candidate:
   - Run verification (admission gate, name, domain, LinkedIn)
   - If failed: update status to FAILED
   - If passed: check for existing identity
   - If exists: link candidate to existing identity
   - If new: mint new identity in `cl.company_identity`
3. Report summary

### Verification Checks
1. **Admission Gate:** Domain OR LinkedIn required
2. **Name Validation:** Non-empty company name
3. **Domain Validation:** Valid format, not generic email domain
4. **LinkedIn Validation:** Must be company URL format

### Database Operations
```sql
-- Mint new identity
INSERT INTO cl.company_identity (
  company_name,
  company_domain,
  linkedin_company_url,
  source_system,
  lifecycle_run_id
) VALUES ($1, $2, $3, $4, $5)
RETURNING company_unique_id
```

### Strengths
- Batch processing with configurable size
- Handles race conditions (unique constraint violations)
- Links to existing identities when found
- Detailed error tracking

### Issues Identified
| Severity | Issue | Location | Recommendation |
|----------|-------|----------|----------------|
| Medium | No domain normalization in verification | Lines 260-306 | Add normalization before comparison |
| Medium | Missing confidence score initialization | Insert query | Add initial confidence record |
| Low | Generic email blocklist incomplete | Lines 325-328 | Expand list or use external source |
| Low | No LinkedIn slug extraction/validation | Lines 336-348 | Extract and validate company slug |
| Info | Progress logging every 100 | Line 205 | Make configurable |

### Blocked Domains
```javascript
const genericDomains = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'aol.com', 'icloud.com', 'live.com', 'msn.com', 'mail.com'
];
```

### DOCTRINE: Script Intent Declaration

#### Purpose
Verify pending candidates against admission gate. Mint new sovereign identities or link to existing. Update candidate status.

#### Allowed Writes
| Table | Operation | Permitted |
|-------|-----------|-----------|
| `cl.company_identity` | INSERT | YES (minting) |
| `cl.company_identity` | UPDATE | NO |
| `cl.company_identity` | DELETE | NO |
| `cl.company_candidate` | UPDATE | YES (status, company_unique_id, verified_at) |
| `cl.company_candidate` | INSERT | NO |
| `cl.company_candidate` | DELETE | NO |
| All other tables | Any | NO |

#### Explicit Non-Responsibilities
| Action | Permitted | Reason |
|--------|-----------|--------|
| Write to `cl.company_names` | NO | Out of scope (future enhancement) |
| Write to `cl.company_domains` | NO | Out of scope (future enhancement) |
| Write to `cl.identity_confidence` | NO | Out of scope (future enhancement) |
| Write to `cl.company_identity_bridge` | NO | Bridge writes are spoke responsibility |
| Write to `cl.cl_errors` | NO | Errors tracked in console/candidate |
| Ingest new candidates | NO | Deferred to ingest script |
| Modify existing identities | NO | Insert-only for minting |
| Archive records | NO | Archive is separate workflow |
| Delete any records | NO | Archive pattern required |

#### Error Visibility
| Error Type | Visibility |
|------------|------------|
| Verification failures | `cl.company_candidate.verification_status = 'FAILED'` |
| Verification errors | `cl.company_candidate.verification_error` |
| Constraint violations | Console output (handled as link) |
| Processing errors | Console output (error array) |
| Connection errors | Console error, exit code 1 |

#### Authorized Scope
| Dimension | Constraint |
|-----------|------------|
| Input source | `cl.company_candidate` with status='PENDING' |
| Batch size | Configurable, default 500 |
| Run filter | Optional ingestion_run_id filter |
| Mint authority | SOLE authority to INSERT into `cl.company_identity` |

---

## Dependencies

All scripts require:

```json
{
  "pg": "^8.x",
  "csv-parse": "^5.x",
  "uuid": "^9.x"
}
```

### Environment Variables
| Variable | Source | Required |
|----------|--------|----------|
| `VITE_DATABASE_URL` | Doppler | Yes |

---

## Operational Checklist

### Before Running Ingestion
- [ ] Validate CSV with `validate_new_companies.cjs`
- [ ] Verify state codes are supported
- [ ] Run with `--dry-run` first
- [ ] Check database connection

### After Ingestion
- [ ] Note the `ingestion_run_id`
- [ ] Verify row counts in `cl.company_candidate`
- [ ] Run `verify_and_mint.cjs` with run ID

### After Minting
- [ ] Check minted count matches expected
- [ ] Review failed candidates
- [ ] Verify new records in `cl.company_identity`

---

## Recommended Improvements

### High Priority
1. **Transaction Support:** Wrap batch operations in transactions
2. **State Mapping:** Load state codes from database or config file
3. **Domain Normalization:** Ensure consistent normalization across all scripts

### Medium Priority
4. **Confidence Initialization:** Create `identity_confidence` record on mint
5. **Name Record:** Create `company_names` record on mint
6. **Domain Record:** Create `company_domains` record on mint
7. **Logging:** Add structured logging (JSON) for monitoring

### Low Priority
8. **Configuration:** Move hardcoded values to config
9. **Metrics:** Add timing and performance metrics
10. **Retry Logic:** Add configurable retry for transient failures

---

## Example Workflow

```bash
# 1. Validate the CSV
doppler run -- node scripts/validate_new_companies.cjs "path/to/companies.csv"

# 2. Dry run ingestion
doppler run -- node scripts/ingest_new_companies.cjs "path/to/companies.csv" --dry-run

# 3. Real ingestion
doppler run -- node scripts/ingest_new_companies.cjs "path/to/companies.csv"
# Note the RUN-MULTI-YYYY-MM-DDTHH-MM-SS run ID

# 4. Verify and mint
doppler run -- node scripts/verify_and_mint.cjs "RUN-MULTI-2026-01-25T10-00-00"

# 5. Check for remaining candidates
doppler run -- node scripts/verify_and_mint.cjs "RUN-MULTI-2026-01-25T10-00-00"
# Repeat until "All candidates processed!"
```

---

## Pipeline Intent Matrix

| Script | May Write | May Read | Must Not Touch | Mint Authority | Notes |
|--------|-----------|----------|----------------|----------------|-------|
| `validate_new_companies.cjs` | (none) | `cl.company_identity` | All tables (read-only) | NO | Validation only |
| `ingest_new_companies.cjs` | `cl.company_candidate` (INSERT) | `cl.company_identity` | `cl.company_identity`, `cl.company_names`, `cl.company_domains`, `cl.identity_confidence`, `cl.company_identity_bridge` | NO | Staging only |
| `verify_and_mint.cjs` | `cl.company_identity` (INSERT), `cl.company_candidate` (UPDATE) | `cl.company_candidate`, `cl.company_identity` | `cl.company_names`, `cl.company_domains`, `cl.identity_confidence`, `cl.company_identity_bridge`, `cl.cl_errors` | YES (sole) | Minting authority |

### Authority Summary

| Capability | validate | ingest | verify_and_mint |
|------------|----------|--------|-----------------|
| Read CSV | YES | YES | NO |
| Read company_identity | YES | YES | YES |
| Read company_candidate | NO | NO | YES |
| Write company_candidate | NO | INSERT | UPDATE |
| Write company_identity | NO | NO | INSERT |
| Mint sovereign ID | NO | NO | YES |
| Modify existing identity | NO | NO | NO |
| Delete any record | NO | NO | NO |

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-01-25 |
| Doctrine Locked | 2026-01-25 |
| Status | DOCTRINE LOCKED |
| Drift Risk | LOW |
| Last Verified | 2026-01-25 |

---

> **Documentation Status:** Doctrine Locked
> **Drift Risk:** LOW
> **Last Verified:** 2026-01-25
