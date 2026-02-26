# Outreach Cohort 3: Never Outreached (Bulk Pipeline Gap)

**Created**: 2026-02-18
**Total**: 58,812 companies
**Ingested**: 2026-02-04 through 2026-02-18

---

## Why These Were Missed

These 58,812 companies were bulk-imported directly into `cl.company_identity` but **never went through the `company_candidate` intake pipeline**. The sovereign mint orchestrator gates on a `company_candidate` JOIN — no candidate row means the orchestrator never saw them. They sat in the database with no sovereign ID and no outreach activity.

Sovereign IDs were bulk-stamped on 2026-02-18 (`sovereign_company_id = company_unique_id`).

---

## Source System Breakdown

| Source System | Total | Has State | Has Domain | Has LinkedIn | Outreach Ready |
|---------------|-------|-----------|------------|--------------|----------------|
| `hunter_dol_enrichment` | 54,155 | 52,259 (96.5%) | 54,155 (100%) | 2,044 (3.8%) | **52,259** |
| `CLAY_SC_SS005` | 2,641 | 2,641 (100%) | 2,495 (94.5%) | 2,641 (100%) | **2,495** |
| `HUNTER_DOL_SS003` | 1,997 | 1,997 (100%) | 1,907 (95.5%) | 0 | **1,907** |
| `MANUAL_OUTREACH_2026` | 19 | 19 (100%) | 19 (100%) | 0 | **19** |
| **TOTAL** | **58,812** | **56,916** (96.8%) | **58,576** (99.6%) | **4,685** (8.0%) | **56,680** |

## Status

- All 58,812 have sovereign IDs (stamped 2026-02-18 via bulk mint)
- `identity_status`: PENDING (all 58,812)
- `existence_verified`: false (all 58,812)
- 92.3% have no `company_candidate` row
- Zero LCS events, zero signals, zero suppression records
- **Zero outreach has ever been sent to any of these companies**

## Outreach Readiness Summary

| Status | Count | % |
|--------|-------|---|
| Outreach Ready (sovereign + name + domain + state) | **56,680** | 96.4% |
| Missing state code only | 1,896 | 3.2% |
| Missing domain only | 236 | 0.4% |
| Missing both | 0 | 0% |
| **Total** | **58,812** | 100% |

## Gaps Blocking Outreach

1. **1,896 missing state code** (all `hunter_dol_enrichment`) — have domain, enrichable
2. **236 missing domain** (146 `CLAY_SC_SS005` + 90 `HUNTER_DOL_SS003`) — have LinkedIn, reverse-lookup possible

## Rollback Reference

All rows captured in `cl.sovereign_mint_backup_20260218` (60,212 total, which includes Cohorts 1 and 2).

Rollback SQL:
```sql
UPDATE cl.company_identity ci
SET sovereign_company_id = NULL
FROM cl.sovereign_mint_backup_20260218 b
WHERE ci.company_unique_id = b.company_unique_id;
```

## Notes

- `hunter_dol_enrichment` (54,155) is the dominant source — DOL Form 5500 companies enriched via Hunter
- These are **not** the same as `DOL_5500_SC` (9,591 SC-only DOL companies imported separately today)
- CLAY_SC_SS005 and HUNTER_DOL_SS003 were imported 2026-02-17/18 and have verified `company_candidate` rows — they were simply too new for the orchestrator to process
- MANUAL_OUTREACH_2026 (19 rows) are manually entered companies from MO, IA, WI, IL, TX, OK, NE, ND

---

## Grand Total Across All 3 Cohorts

| Cohort | Total | Outreach Ready | Gap |
|--------|-------|----------------|-----|
| 1 — Barton Appointments | 496 | 0 | 496 missing state |
| 2 — Fractional CFO | 904 | 532 | 372 missing state |
| 3 — Never Outreached | 58,812 | 56,680 | 2,132 missing domain/state |
| **GRAND TOTAL** | **60,212** | **57,212** | **3,000 not ready** |

---

**Document Control**: HUB-CL-001 | CC-01
