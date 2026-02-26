# Outreach Cohort 2: Fractional CFO Outreach

**Created**: 2026-02-18
**Source System**: `fractional_cfo_outreach`
**Ingested**: 2026-02-07

---

## Counts

| Metric | Value |
|--------|-------|
| Total Companies | **904** |
| Has Sovereign ID | 904 (100%) |
| Has Company Name | 904 (100%) |
| Has Domain | 890 (98.5%) |
| Has LinkedIn | 892 (98.7%) |
| Has State Code | 532 (58.8%) |
| Outreach Ready | **532** (58.8%) |

## Status

- All 904 have sovereign IDs (stamped 2026-02-18 via bulk mint)
- `identity_status`: PENDING (all 904)
- `existence_verified`: false (all 904)
- No `company_candidate` rows exist for this cohort
- Zero LCS events, zero signals, zero suppression records
- Zero outreach has ever been sent

## Gaps Blocking Outreach

| Gap | Rows Affected |
|-----|---------------|
| Missing state code | 372 |
| Missing domain | 14 |
| Missing both | ~14 overlap |

- **532 are outreach-ready now** (sovereign + name + domain + state)
- **372 need state enrichment** — all have domain, so geocoding/Clay is feasible
- **14 missing domain** — have LinkedIn URLs, could reverse-lookup

## Rollback Reference

These rows are captured in `cl.sovereign_mint_backup_20260218` for rollback if needed.

## Notes

- High LinkedIn coverage (98.7%) makes this cohort strong for dual-channel outreach (email + LinkedIn)
- State distribution of the 532 covered: CA, TX, FL, NY, GA, CO, VA, NC and others

---

**Document Control**: HUB-CL-001 | CC-01
