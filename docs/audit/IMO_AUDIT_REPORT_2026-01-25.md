# IMO AUDIT REPORT

## Executive Summary

| Field | Value |
|-------|-------|
| **Repo** | company-lifecycle-cl |
| **Audit Date** | 2026-01-25 |
| **Neon Verified** | YES |
| **Template Version** | v1.4.0 (imo-creator) |
| **Overall Status** | **FAIL — SCHEMA DRIFT DETECTED** |

---

## Findings

| Severity | Hub | Issue | Evidence | Required Fix |
|----------|-----|-------|----------|--------------|
| **CRITICAL** | CL | Schema documentation severely outdated | `CL_COMPANY_IDENTITY.md` documents 6 columns, Neon has 32 | Update schema docs to match Neon |
| **HIGH** | CL | No CHECKLIST.md in docs root | Expected `docs/CHECKLIST.md` | Create from template or rename existing |
| **MEDIUM** | CL | Schema docs missing verification stamp | No "Source of Truth: Neon" stamp | Add verification stamp |
| **LOW** | CL | Connection string hardcoded in scripts | Scripts use literal connection string | Migrate to Doppler `doppler run --` |

---

## Neon Verification

### Connection Status

| Check | Result |
|-------|--------|
| Doppler Access | PASS |
| Neon Connection | PASS |
| Schema Read | PASS |

### Tables Verified

| Schema | Tables | Columns | Status |
|--------|--------|---------|--------|
| cl | 21 | 265 | VERIFIED |

### CL Schema Tables (Neon Source of Truth)

| Table | Rows | Verified |
|-------|------|----------|
| company_identity | 51,910 | YES |
| company_identity_archive | 22,263 | YES |
| company_candidate | 62,162 | YES |
| company_names | 78,204 | YES |
| company_domains | 51,910 | YES |
| identity_confidence | 51,910 | YES |
| domain_hierarchy | 4,705 | YES |
| company_identity_bridge | 71,820 | YES |
| cl_errors | 0 | YES |
| cl_errors_archive | 16,103 | YES |

### Drift Detection

| Document | Columns Documented | Columns in Neon | Drift |
|----------|-------------------|-----------------|-------|
| `CL_COMPANY_IDENTITY.md` | 6 | 32 | **CRITICAL: 26 columns missing** |
| `CL_SCHEMA_ERD.md` | ~18 | 32 | **MEDIUM: ~14 columns missing** |

### Missing Columns in CL_COMPANY_IDENTITY.md

The following columns exist in Neon but are NOT documented:

```
company_fingerprint
lifecycle_run_id
existence_verified
verification_run_id
verified_at
domain_status_code
name_match_score
state_match_result
canonical_name
state_verified
employee_count_band
identity_pass
identity_status
last_pass_at
eligibility_status
exclusion_reason
entity_role
sovereign_company_id
final_outcome
final_reason
outreach_id
sales_process_id
client_id
outreach_attached_at
sales_opened_at
client_promoted_at
```

---

## Template Sync Status

### IMO-Creator v1.4.0 Compliance

| Check | Status |
|-------|--------|
| `templates/doctrine/` present | PASS |
| `templates/claude/` present | PASS |
| `templates/validators/` present | PASS |
| `SNAP_ON_TOOLBOX.yaml` present | PASS |
| `IMO_CONTROL.json` present | PASS |
| `CLAUDE.md` present | PASS |
| `CONSTITUTION.md` present | PASS |

### Forbidden Structures

| Pattern | Found | Status |
|---------|-------|--------|
| `src/utils/` | No | PASS |
| `src/helpers/` | No | PASS |
| `src/common/` | No | PASS |
| `src/lib/` | No | PASS |
| `node_modules/**/utils/` | Yes (deps) | PASS (exempt) |

---

## Hub Inventory

### PRD Documents

| Document | Status |
|----------|--------|
| PRD_COMPANY_LIFECYCLE.md | PRESENT |
| PRD-COMPANY-LIFECYCLE.md | PRESENT |
| PRD-GATE-ZERO.md | PRESENT |
| PRD-NEON-AGENT.md | PRESENT |
| PRD-MULTI-STATE-INTAKE.md | PRESENT |

### ADR Documents

| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | CL as Sovereign Lifecycle Authority | PRESENT |
| ADR-002 | Gate Zero as Pre-Sovereign Verification Stage | PRESENT |
| ADR-003 | Identity Anchor Doctrine & State Expansion | PRESENT |
| ADR-004 | Identity Funnel Implementation | PRESENT |
| ADR-005 | Four-Hub Architecture | PRESENT |
| ADR-006 | Multi-State Intake Doctrine Lock | PRESENT |
| ADR-007 | Multi-State Batch Ingestion Pipeline | PRESENT |
| ADR-008 | Lifecycle Pointer Registry | PRESENT |

### Checklists

| Document | Status |
|----------|--------|
| HUB_COMPLIANCE.md | PRESENT (in checklists/) |
| CHECKLIST.md (root) | MISSING |

---

## Blockers

### CRITICAL — Must Fix Before Deployment

1. **Schema Documentation Drift**
   - `CL_COMPANY_IDENTITY.md` documents only 6 of 32 columns
   - All schema docs must be regenerated from Neon
   - Add verification stamp with date

### HIGH — Must Fix Before Next Sprint

2. **Scripts Use Hardcoded Credentials**
   - `scripts/verify_and_mint.cjs` has hardcoded connection string
   - `scripts/ingest_new_companies.cjs` has hardcoded connection string
   - `scripts/validate_new_companies.cjs` has hardcoded connection string
   - Migrate to: `doppler run -- node scripts/script.cjs`

---

## Verdict

### **NOT COMPLIANT — DO NOT PROCEED**

The repository has **CRITICAL schema drift**. The documented schema does not match Neon source of truth.

### Required Actions

| Priority | Action | Owner |
|----------|--------|-------|
| 1 | Regenerate `CL_COMPANY_IDENTITY.md` from Neon (32 columns) | Auditor |
| 2 | Update `CL_SCHEMA_ERD.md` with missing columns | Auditor |
| 3 | Add verification stamps to all schema docs | Auditor |
| 4 | Migrate scripts to use Doppler | Developer |
| 5 | Create `docs/CHECKLIST.md` from template | Developer |

---

## Neon Access Documentation

Created: `docs/operations/NEON_ACCESS.md`

Access method:
```bash
# View secrets
doppler secrets --project company-lifecycle-cl --config dev

# Run with secrets
doppler run -- node scripts/my_script.cjs
```

---

## Audit Metadata

| Field | Value |
|-------|-------|
| Auditor | Claude Opus 4.5 (IMO Template Auditor) |
| Mode | READ-ONLY |
| Authority | CONSTITUTIONAL |
| Source of Truth | Neon PostgreSQL |
| Template Source | imo-creator v1.4.0 |

---

## Next Steps

1. **Fix schema drift** — Regenerate docs from Neon
2. **Re-run audit** — Verify compliance after fixes
3. **Add CI gate** — Prevent future drift

---

> Source of Truth: Neon
> Verification Mode: Read-Only
> Verification Date: 2026-01-25
