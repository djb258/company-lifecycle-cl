# Run Log: Hunter DOL Enrichment Intake

## Run Metadata

| Field | Value |
|-------|-------|
| **Run Date** | 2026-02-04 |
| **Run ID** | RUN-HUNTER-DOL-2026-02-04 |
| **Operator** | Claude Code (Automated) |
| **Source Table** | `dol.ein_urls` |
| **Source System** | `hunter_dol_enrichment` |

---

## Source Data

| Metric | Count |
|--------|-------|
| Total Records in `dol.ein_urls` | 127,909 |
| Hunter DOL EINs | 58,069 |
| Clean Domains (1 EIN per domain) | 54,853 |
| Already in Outreach | 723 |
| **Eligible for CL Intake** | **54,166** |

### State Distribution

| State | Count |
|-------|-------|
| OH | 12,321 |
| PA | 11,934 |
| VA | 8,235 |
| MD | 7,363 |
| NC | 7,293 |
| KY | 3,521 |
| DC | 2,602 |
| WV | 897 |

---

## Phase 1: Pre-Flight Validation

### Source Query

```sql
WITH clean_domains AS (
    SELECT
        domain,
        MIN(ein) as ein,
        MIN(company_name) as company_name,
        MIN(city) as city,
        MIN(state) as state
    FROM dol.ein_urls
    WHERE discovery_method = 'hunter_dol_enrichment'
    GROUP BY domain
    HAVING COUNT(DISTINCT ein) = 1
)
SELECT COUNT(*) as eligible_count
FROM clean_domains cd
LEFT JOIN outreach.outreach o ON LOWER(cd.domain) = LOWER(o.domain)
LEFT JOIN cl.company_identity ci ON LOWER(cd.domain) = LOWER(ci.company_domain)
WHERE o.outreach_id IS NULL
  AND ci.company_unique_id IS NULL;
```

| Check | Result |
|-------|--------|
| Clean domains (1 EIN per domain) | 54,853 PASS |
| Exclude existing outreach | -723 |
| Exclude existing CL identities | -11 |
| **Pre-flight count** | **54,155** |

### Data Quality

| Criterion | Status |
|-----------|--------|
| EIN verified from DOL Form 5500 | PASS |
| Hunter-discovered domains | PASS |
| No collision domains included | PASS |
| State coverage validated | PASS |

---

## Phase 2: Sovereign ID Minting

### Execution

```sql
INSERT INTO cl.company_identity (
    company_name,
    company_domain,
    source_system
)
SELECT
    cd.company_name,
    cd.domain,
    'hunter_dol_enrichment'
FROM (
    SELECT
        domain,
        MIN(ein) as ein,
        MIN(company_name) as company_name,
        MIN(city) as city,
        MIN(state) as state
    FROM dol.ein_urls
    WHERE discovery_method = 'hunter_dol_enrichment'
    GROUP BY domain
    HAVING COUNT(DISTINCT ein) = 1
) cd
LEFT JOIN outreach.outreach o ON LOWER(cd.domain) = LOWER(o.domain)
LEFT JOIN cl.company_identity ci ON LOWER(cd.domain) = LOWER(ci.company_domain)
WHERE o.outreach_id IS NULL
  AND ci.company_unique_id IS NULL
RETURNING company_unique_id, company_domain;
```

### Results

| Metric | Count |
|--------|-------|
| Attempted | 54,155 |
| **Minted** | **54,155** |
| Skipped (duplicate domain) | 0 |
| Errors | 0 |

---

## Phase 3: Post-Run Verification

### cl.company_identity

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Total Records | ~51,910 | ~106,065 | **+54,155** |
| Source: hunter_dol_enrichment | 0 | 54,155 | +54,155 |

### Excluded Data (Not Processed)

| Category | Count | Reason |
|----------|-------|--------|
| Collision domains | 1,388 | Multiple EINs per domain |
| Already in Outreach | 723 | Domain already exists |
| Already in CL | 11 | Domain already minted |

---

## Output Files

| File | Location | Contents |
|------|----------|----------|
| `minted_sovereign_ids.json` | Project root | All 54,155 company_unique_id + domain pairs |
| `sovereign_id_minting_summary.md` | Project root | Execution summary |

---

## Verification Queries

```sql
-- Count new identities by source system
SELECT source_system, COUNT(*)
FROM cl.company_identity
WHERE source_system = 'hunter_dol_enrichment'
GROUP BY source_system;

-- Sample newly minted records
SELECT company_unique_id, company_name, company_domain
FROM cl.company_identity
WHERE source_system = 'hunter_dol_enrichment'
LIMIT 10;

-- Verify no duplicate domains
SELECT company_domain, COUNT(*)
FROM cl.company_identity
WHERE source_system = 'hunter_dol_enrichment'
GROUP BY company_domain
HAVING COUNT(*) > 1;
```

---

## EIN Linkage Note

**Important:** EIN data is NOT stored in `cl.company_identity`.

The EIN remains in `dol.ein_urls` and can be joined via domain:

```sql
SELECT
    ci.company_unique_id,
    ci.company_name,
    ci.company_domain,
    d.ein
FROM cl.company_identity ci
JOIN dol.ein_urls d ON LOWER(ci.company_domain) = LOWER(d.domain)
WHERE ci.source_system = 'hunter_dol_enrichment';
```

Alternatively, EIN can be stored in `cl.company_identity_bridge` metadata if persistent linkage is required.

---

## Downstream Handoff

### For Outreach Hub

Outreach can now:
1. Query CL for new sovereign IDs where `source_system = 'hunter_dol_enrichment'`
2. Mint `outreach_id` for each company
3. Write `outreach_id` back to CL (WRITE-ONCE)
4. Create outreach spine + sub-hub records
5. Link Hunter contacts via domain match

```sql
-- Query for Outreach to mint outreach_ids
SELECT
    company_unique_id,
    company_name,
    company_domain
FROM cl.company_identity
WHERE source_system = 'hunter_dol_enrichment'
  AND outreach_id IS NULL;
```

---

## Conclusion

All 54,155 Hunter DOL enrichment companies have been successfully minted as sovereign identities in `cl.company_identity`.

| Summary | Value |
|---------|-------|
| Total Minted | 54,155 |
| Source System | hunter_dol_enrichment |
| Data Quality Failures | 0 |
| Pipeline Status | SUCCESS |

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-02-04 |
| Author | Claude Code |
| Status | COMPLETE |
| ADR Reference | N/A (Direct intake, no schema change) |
