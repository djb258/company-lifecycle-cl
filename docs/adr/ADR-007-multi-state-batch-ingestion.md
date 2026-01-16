# ADR-007: Multi-State Batch Ingestion Pipeline

## Status
**Accepted** - 2026-01-14

## Context

Following the doctrine lock established in ADR-006, we needed to operationalize multi-state company ingestion at scale. A CSV file containing 2,423 companies across 8 states (DE, VA, MD, PA, OH, NC, KY, WV) required ingestion into the Company Lifecycle system.

### Requirements
1. Validate CSV against CL admission gate (domain OR LinkedIn required)
2. Deduplicate against existing `cl.company_identity` records
3. Ingest new companies into `cl.company_candidate` staging table
4. Verify and mint sovereign identities

## Decision

We implemented a three-phase batch ingestion pipeline:

### Phase 1: Validation (`validate_new_companies.cjs`)
- CSV contract validation (Name + Domain OR LinkedIn)
- Duplicate domain check against `cl.company_identity`
- Duplicate LinkedIn URL check against `cl.company_identity`
- Produces "truly new" count before ingestion

### Phase 2: Ingestion (`ingest_new_companies.cjs`)
- State name to code mapping (Delaware -> DE, etc.)
- Domain normalization (strip protocol, www, paths)
- Source record ID generation with state prefix
- Insert into `cl.company_candidate` with `PENDING` status
- Supports `--dry-run` flag for validation without writes

### Phase 3: Verification & Minting (`verify_and_mint.cjs`)
- Fetch PENDING candidates in configurable batches
- Apply admission gate verification
- Check for existing identity (domain or LinkedIn match)
- Mint new sovereign identity or link to existing
- Update candidate status to VERIFIED

## Implementation Details

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

### Source System Format
```
CLAY_MULTI_{STATE_CODE}
```
Examples: `CLAY_MULTI_DE`, `CLAY_MULTI_VA`

### Source Record ID Format
```
{STATE_CODE}-DOM-{normalized-domain}
{STATE_CODE}-LI-{linkedin-slug}
{STATE_CODE}-ROW-{row-number}
```

## Run Results (2026-01-14)

### Input
- CSV File: `NEW_COMPANIES_FOR_CLAY.csv`
- Total Rows: 2,423

### Validation
| Metric | Count |
|--------|-------|
| Contract PASS | 2,423 |
| Contract FAIL | 0 |
| Already in CL | 35 |
| Truly New | 2,388 |

### Ingestion
| Metric | Count |
|--------|-------|
| Inserted | 2,350 |
| Skipped (duplicate) | 73 |
| Skipped (no state) | 0 |
| Errors | 0 |

### Minting
| Metric | Count |
|--------|-------|
| Processed | 2,350 |
| Verified | 2,350 |
| Failed | 0 |
| **NEW MINTED** | **2,350** |
| Linked | 0 |

### By State
| State | Minted |
|-------|--------|
| DE | 1,590 |
| VA | 239 |
| MD | 159 |
| PA | 147 |
| OH | 133 |
| NC | 55 |
| KY | 14 |
| WV | 13 |

## Bug Fix

Initial minting failed due to `state_code` column not existing in `cl.company_identity`. The INSERT statement was corrected to only use valid columns:

```javascript
// BEFORE (failed)
INSERT INTO cl.company_identity (
  company_name, company_domain, linkedin_company_url,
  source_system, state_code, lifecycle_run_id  // state_code doesn't exist
)

// AFTER (working)
INSERT INTO cl.company_identity (
  company_name, company_domain, linkedin_company_url,
  source_system, lifecycle_run_id
)
```

## Consequences

### Positive
- 2,350 new sovereign identities minted across 8 states
- Pipeline validated against real data at scale
- Scripts reusable for future batch ingestions
- Zero data quality failures

### Negative
- State code not captured in `company_identity` (stored in `company_candidate` only)
- Consider adding `state_code` column to `company_identity` for future queries

### Neutral
- Run ID format: `RUN-MULTI-YYYY-MM-DDTHH-MM-SS`
- Scripts located in `scripts/` folder (CommonJS format)

## Related Documents

- [[ADR-006-multi-state-intake-doctrine-lock]] - Doctrine lock implementation
- [[GATE_ZERO_INTAKE]] - Intake schema
- [[PRD-MULTI-STATE-INTAKE]] - Product requirements

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/validate_new_companies.cjs` | Pre-ingestion validation |
| `scripts/ingest_new_companies.cjs` | CSV to company_candidate |
| `scripts/verify_and_mint.cjs` | Candidate to sovereign identity |
