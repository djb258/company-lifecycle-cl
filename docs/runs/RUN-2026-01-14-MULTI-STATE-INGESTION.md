# Run Log: Multi-State Batch Ingestion

## Run Metadata

| Field | Value |
|-------|-------|
| **Run Date** | 2026-01-14 |
| **Run ID** | RUN-MULTI-2026-01-14T... |
| **Operator** | Automated Pipeline |
| **Source File** | `NEW_COMPANIES_FOR_CLAY.csv` |
| **Source Location** | `c:\Users\CUSTOM PC\Desktop\Clay Tables\` |

---

## Source Data

| Metric | Count |
|--------|-------|
| Total Rows in CSV | 2,423 |
| Unique Companies | 2,423 |
| States Represented | 8 |

### States in Source
- Delaware (DE)
- Virginia (VA)
- Maryland (MD)
- Pennsylvania (PA)
- Ohio (OH)
- North Carolina (NC)
- Kentucky (KY)
- West Virginia (WV)

---

## Phase 1: Validation

**Script:** `scripts/validate_new_companies.cjs`

| Check | Result |
|-------|--------|
| CSV Contract (Name + Domain/LinkedIn) | 2,423 PASS |
| Duplicate Domains in CL | 35 found |
| Duplicate LinkedIn URLs in CL | 0 found |
| Truly New Companies | 2,388 |

---

## Phase 2: Ingestion

**Script:** `scripts/ingest_new_companies.cjs`

| Metric | Count |
|--------|-------|
| Attempted | 2,423 |
| Inserted | 2,350 |
| Skipped (duplicate) | 73 |
| Skipped (no state) | 0 |
| Skipped (contract fail) | 0 |
| Errors | 0 |

### Insertions by State
| State | Count |
|-------|-------|
| DE | 1,590 |
| VA | 239 |
| MD | 159 |
| PA | 147 |
| OH | 133 |
| NC | 55 |
| KY | 14 |
| WV | 13 |

---

## Phase 3: Verification & Minting

**Script:** `scripts/verify_and_mint.cjs`

### Initial Run (Failed)
- Error: `column "state_code" of relation "company_identity" does not exist`
- All 500 candidates failed to mint
- Root cause: INSERT statement included non-existent column

### Bug Fix Applied
Removed `state_code` from INSERT statement in `verify_and_mint.cjs`

### Final Run (Success)
| Metric | Count |
|--------|-------|
| Processed | 2,350 |
| Verified | 2,350 |
| Failed | 0 |
| **NEW MINTED** | **2,350** |
| Linked to Existing | 0 |

### Minted by State
| State | Count |
|-------|-------|
| DE | 1,590 |
| VA | 239 |
| MD | 159 |
| PA | 147 |
| OH | 133 |
| NC | 55 |
| KY | 14 |
| WV | 13 |

---

## Post-Run Database State

### cl.company_candidate
| Status | Count |
|--------|-------|
| VERIFIED | 2,350 (new) |
| PENDING | 0 |
| FAILED | 0 |

### cl.company_identity
| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Total Records | ~59,800 | ~62,150 | +2,350 |

---

## Issues & Resolutions

### Issue 1: state_code Column
**Problem:** `verify_and_mint.cjs` attempted to INSERT into `state_code` column that doesn't exist in `cl.company_identity`

**Resolution:** Removed `state_code` from INSERT statement. State is preserved in `cl.company_candidate.state_code` and can be joined if needed.

**Future Consideration:** May want to add `state_code` column to `cl.company_identity` for direct querying.

---

## Files Modified

| File | Change |
|------|--------|
| `scripts/verify_and_mint.cjs` | Removed state_code from INSERT |

---

## Verification Queries

```sql
-- Check new identities by source system
SELECT source_system, COUNT(*)
FROM cl.company_identity
WHERE source_system LIKE 'CLAY_MULTI_%'
GROUP BY source_system;

-- Check verified candidates
SELECT state_code, COUNT(*)
FROM cl.company_candidate
WHERE verification_status = 'VERIFIED'
  AND source_system LIKE 'CLAY_MULTI_%'
GROUP BY state_code;
```

---

## Conclusion

All 2,350 new companies from the multi-state CSV have been successfully:
1. Validated against CL admission gate
2. Ingested into `cl.company_candidate`
3. Verified and minted as sovereign identities in `cl.company_identity`

Zero data quality failures. Pipeline validated for future batch ingestions.
