# Company Lifecycle Lock (DOCTRINE-LOCK)

**Status:** LOCKED
**Version:** 1.0
**Last Updated:** 2026-01-13
**Enforcement:** Compile-time guards in `pipeline/ingest.js`

---

## Purpose

This document encodes the **non-negotiable intake rules** for the Company Lifecycle (CL) system. These rules are:

1. **Permanent** — They do not change between states or over time
2. **Enforced** — Compile-time guards fail the build if violated
3. **Inherited** — All future states automatically inherit these rules

**No future audit is required.** Any state company CSV that passes through the pipeline is guaranteed to comply with these invariants.

---

## Locked Invariants

### 1. CSV Contract (Global)

| Field | Requirement | Used For |
|-------|-------------|----------|
| `Name` | **REQUIRED** | `company_name` |
| `Domain` | At least one required | Identity anchor |
| `LinkedIn URL` | At least one required | Identity anchor |
| `Description` | Optional | `raw_payload` only |
| `Primary Industry` | Optional | `raw_payload` only |
| `Size` | Optional | `raw_payload` only |
| `Type` | Optional | `raw_payload` only |
| `Location` | Optional | `raw_payload` only |
| `Country` | Optional | `raw_payload` only |

**Admission Gate:** `company_domain IS NOT NULL OR linkedin_url IS NOT NULL`

**Identity is NEVER inferred from optional fields.**

---

### 2. State Handling (Adapter Rule)

| Rule | Enforcement |
|------|-------------|
| `state_code` MUST be injected by adapter | Constructor throws if missing |
| State is NEVER parsed from CSV fields | No CSV column maps to `state_code` |
| Each adapter declares unique `state_code` | Registry prevents duplicates |
| Each adapter declares unique `source_system` | Registry prevents duplicates |
| Adapters may NOT share state config | Compile-time guard fails on collision |

**Implementation:**
- All adapters extend `StateCsvSourceAdapter`
- `StateCsvSourceAdapter` constructor enforces these rules
- Adapter registry in `ingest.js` verifies at module load time

---

### 3. Identity Minting

| Rule | Enforcement |
|------|-------------|
| Minting requires passed verification | `assertVerificationComplete()` guard |
| Admission gate must pass | `lifecycle_worker.js:260-267` |
| No downstream hub may modify identity | `company_unique_id` is immutable FK |
| No downstream hub may re-mint identity | Only CL has minting authority |

**Identity Field Allowlist (LOCKED):**
```
company_name
company_domain
linkedin_url
```

No other fields may be used for identity decisions.

---

### 4. Lifecycle Order (Hard Gate)

```
CSV Intake
    │
    ▼
company_candidate (staging)
    │
    ▼
verification (lifecycle_worker.verifyCandidate)
    │
    ▼
company_identity (sovereign ID minted)
    │
    ▼
outreach_context (downstream activation)
    │
    ▼
downstream hubs (read-only reference)
```

**Enforcement:**
- Verification MUST complete before minting (`assertVerificationComplete`)
- Minting updates `company_candidate.company_unique_id` AFTER verification
- Downstream hubs reference via FK only

---

### 5. Documentation Sync

| Rule | Enforcement |
|------|-------------|
| Gate Zero doctrine matches code | OR logic enforced in both |
| `state_code` is adapter-injected | Documented and enforced |
| Allowlist is locked | `getIdentityFieldAllowlist()` returns frozen array |

**If documentation drifts from code, code is authoritative.**

---

## Registered Adapters

| State | Adapter | Source System | Status |
|-------|---------|---------------|--------|
| NC | `NCExcelSourceAdapter` | `NC_EXCEL_SS001` | Active |
| DE | `DECsvSourceAdapter` | `DE_CSV_SS002` | Active |

---

## Adding a New State

To add a new state (e.g., TX):

1. Create `pipeline/adapters/source_tx_csv.js`
2. Extend `StateCsvSourceAdapter`
3. Declare explicit `state_code: 'TX'`
4. Declare explicit `source_system: 'TX_CSV_SS003'`
5. Add to ADAPTERS registry in `pipeline/ingest.js`
6. Compile-time guards will verify compliance automatically

**Example:**
```javascript
const { StateCsvSourceAdapter } = require('./state_csv_adapter');

class TXCsvSourceAdapter extends StateCsvSourceAdapter {
  constructor() {
    super({
      source_system: 'TX_CSV_SS003',
      state_code: 'TX',
      state_name: 'Texas',
    });
  }

  async *read(options) {
    // Implementation...
  }
}

module.exports = { TXCsvSourceAdapter };
```

**The new state automatically inherits all intake invariants.** No audit required.

---

## Compile-Time Guards

The following guards execute at module load time (`pipeline/ingest.js`):

| Guard | What It Checks | Failure Mode |
|-------|----------------|--------------|
| `assertAdapterInheritance` | Adapter extends `StateCsvSourceAdapter` | `process.exit(1)` |
| `assertAdapterInheritance` | `state_code` is valid (2 uppercase letters) | `process.exit(1)` |
| `assertAdapterInheritance` | `source_system` is declared | `process.exit(1)` |
| `assertIdentityFieldAllowlist` | Allowlist matches expected fields | `process.exit(1)` |
| `StateCsvSourceAdapter` registry | No duplicate `state_code` | Constructor throws |
| `StateCsvSourceAdapter` registry | No duplicate `source_system` | Constructor throws |

**If any guard fails, the ingestion CLI will not run.**

---

## Downstream Implications

### Outreach Hub
- Receives `company_unique_id` only
- Cannot modify or re-mint identity
- Must wait for CL verification

### People Hub
- Cannot bind to company before CL verification
- References via `company_unique_id` FK
- Employment data is DOWNSTREAM of identity

### DOL / Blog / Company Target
- Read-only access to `cl.company_identity`
- Use enrichment fields from `raw_payload` if needed
- Cannot influence identity minting

---

## Traceability

| Artifact | Path |
|----------|------|
| Base adapter | `pipeline/adapters/state_csv_adapter.js` |
| NC adapter | `pipeline/adapters/source_nc_excel.js` |
| DE adapter | `pipeline/adapters/source_de_csv.js` |
| Ingestion CLI | `pipeline/ingest.js` |
| Lifecycle worker | `pipeline/lifecycle_worker.js` |
| Gate Zero schema | `docs/schema/GATE_ZERO_INTAKE.md` |
| CL Doctrine | `docs/doctrine/CL_DOCTRINE.md` |

---

## Final Declaration

> **This contract is LOCKED.**
>
> **Any state company CSV flows through the same lifecycle.**
>
> **No future state can bypass identity rules.**
>
> **No operator needs to rerun audits manually.**
>
> **Delaware is just data—the spine holds.**

---

**Lock Version:** 1.0
**Lock Date:** 2026-01-13
**Lock Authority:** SHQ / Barton Ops
