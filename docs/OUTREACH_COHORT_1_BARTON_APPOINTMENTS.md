# Outreach Cohort 1: Barton Appointments

**Created**: 2026-02-18
**Source System**: `barton_appointments`
**Ingested**: 2026-02-09

---

## Counts

| Metric | Value |
|--------|-------|
| Total Companies | **496** |
| Has Sovereign ID | 496 (100%) |
| Has Company Name | 496 (100%) |
| Has Domain | 496 (100%) |
| Has LinkedIn | 0 (0%) |
| Has State Code | **0 (0%)** |
| Outreach Ready | **0** |

## Status

- All 496 have sovereign IDs (stamped 2026-02-18 via bulk mint)
- `identity_status`: PENDING (all 496)
- `existence_verified`: false (all 496)
- No `company_candidate` rows exist for this cohort
- Zero LCS events, zero signals, zero suppression records
- Zero outreach has ever been sent

## Gaps Blocking Outreach

1. **State code**: 496/496 missing — must be enriched from domain before outreach IDs can be assigned
2. **LinkedIn**: 0/496 — not required for email outreach but limits LinkedIn channel
3. **Identity verification**: Not run — all PENDING

## Rollback Reference

These rows are captured in `cl.sovereign_mint_backup_20260218` for rollback if needed.

## Notes

- `has_appointment` flag exists on `outreach.outreach` table — likely intended for this cohort
- All 496 have valid domains, so state enrichment via geocoding or Clay is feasible

---

**Document Control**: HUB-CL-001 | CC-01
