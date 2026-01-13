# PRD: Multi-State Company Intake System

**Hub:** Company Lifecycle (CL)
**Hub ID:** HUB-CL-001
**Version:** 1.0
**Status:** Implemented
**Date:** 2026-01-13
**Author:** SHQ

---

## 1. Executive Summary

This PRD defines the multi-state company intake system for Company Lifecycle. The system enables ingestion of company data from any US state through a unified, doctrine-locked pipeline that enforces identity rules without per-state audits.

---

## 2. Problem Statement

### Current State
- NC was the first state source stream (SS-001)
- Each new state required manual audit to ensure compliance
- State-specific logic risked leaking into core lifecycle
- No compile-time enforcement of intake rules

### Desired State
- Any state flows through the same identity rules
- New states inherit all invariants automatically
- Compile-time guards prevent violations
- No manual audits required for new states

---

## 3. Goals & Non-Goals

### Goals
1. Enable multi-state company intake (NC, DE, TX, etc.)
2. Enforce identity rules at compile time
3. Isolate state-specific logic to adapters only
4. Prevent identity field scope creep
5. Ensure documentation matches code

### Non-Goals
- Per-state enrichment pipelines
- State-specific identity rules
- Real-time state validation against LinkedIn
- Automated state detection from CSV content

---

## 4. Solution Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SOURCE ADAPTERS                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ NC Excel     │  │ DE CSV       │  │ TX CSV       │      │
│  │ Adapter      │  │ Adapter      │  │ Adapter      │      │
│  │ (SS-001)     │  │ (SS-002)     │  │ (SS-003)     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └────────────────┬┴─────────────────┘               │
│                          │                                  │
│                          ▼                                  │
│             ┌────────────────────────┐                      │
│             │ StateCsvSourceAdapter  │ ← BASE CLASS         │
│             │ (INVARIANT ENFORCEMENT)│                      │
│             └────────────┬───────────┘                      │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    COMPILE-TIME GUARDS                       │
│  • assertAdapterInheritance()                               │
│  • assertIdentityFieldAllowlist()                           │
│  • Adapter registry collision detection                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    INTAKE SERVICE                            │
│  pipeline/ingest.js → pipeline/intake_service.js            │
│  Writes to: cl.company_candidate                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    LIFECYCLE WORKER                          │
│  pipeline/lifecycle_worker.js                               │
│  • verifyCandidate() → assertVerificationComplete()         │
│  • mintIdentity() → cl.company_identity                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. CSV Contract

### Required Fields

| Field | Requirement | Maps To |
|-------|-------------|---------|
| `Name` | REQUIRED | `company_name` |
| `Domain` | At least one | `company_domain` |
| `LinkedIn URL` | At least one | `linkedin_url` |

### Optional Fields (→ raw_payload only)

| Field | Purpose |
|-------|---------|
| `Description` | Company description |
| `Primary Industry` | Classification |
| `Size` | Employee count band |
| `Type` | Public/Private |
| `Location` | City, State string |
| `Country` | Country name |

### Admission Gate

```
company_domain IS NOT NULL OR linkedin_url IS NOT NULL
```

Records with NEITHER are rejected.

---

## 6. Identity Field Allowlist

```javascript
const IDENTITY_FIELD_ALLOWLIST = Object.freeze([
  'company_name',
  'company_domain',
  'linkedin_url',
]);
```

**These are the ONLY fields that may influence identity decisions.**

No other fields may be added without ADR authorization.

---

## 7. Adapter Requirements

### Base Class Extension

All adapters MUST extend `StateCsvSourceAdapter`:

```javascript
class DECsvSourceAdapter extends StateCsvSourceAdapter {
  constructor() {
    super({
      source_system: 'DE_CSV_SS002',  // REQUIRED: Unique
      state_code: 'DE',                // REQUIRED: 2 letters
      state_name: 'Delaware',          // REQUIRED: For docs
    });
  }
}
```

### Invariants Enforced

| Invariant | Enforcement |
|-----------|-------------|
| `state_code` explicit | Constructor throws |
| `source_system` unique | Registry collision |
| Identity fields only | Allowlist frozen |
| No state parsing | Code review |

---

## 8. Compile-Time Guards

Guards execute at module load in `pipeline/ingest.js`:

```javascript
// Guard 1: Adapter inheritance
assertAdapterInheritance(NCExcelSourceAdapter, 'NCExcelSourceAdapter');
assertAdapterInheritance(DECsvSourceAdapter, 'DECsvSourceAdapter');

// Guard 2: Identity allowlist
assertIdentityFieldAllowlist();
```

### Failure Modes

| Guard | Failure |
|-------|---------|
| Missing inheritance | `process.exit(1)` |
| Invalid state_code | `process.exit(1)` |
| Missing source_system | `process.exit(1)` |
| Allowlist mismatch | `process.exit(1)` |
| Duplicate state_code | Constructor throws |

---

## 9. Registered Source Streams

| Stream ID | State | Adapter | Status |
|-----------|-------|---------|--------|
| SS-001 | NC | `NCExcelSourceAdapter` | Active |
| SS-002 | DE | `DECsvSourceAdapter` | Active |
| SS-003 | TX | `TXCsvSourceAdapter` | Planned |

---

## 10. Lifecycle Order

```
1. CSV Intake       → Adapter reads file
2. company_candidate → Staging table (pre-sovereign)
3. Verification     → verifyCandidate()
4. company_identity → Sovereign ID minted
5. Downstream       → Outreach, Sales, Client
```

**`assertVerificationComplete()` prevents skipping verification.**

---

## 11. Adding New States

### Process

1. Create `pipeline/adapters/source_XX_csv.js`
2. Extend `StateCsvSourceAdapter`
3. Declare `state_code`, `source_system`, `state_name`
4. Add to ADAPTERS in `pipeline/ingest.js`
5. Compile-time guards verify compliance

### Example

```javascript
// pipeline/adapters/source_tx_csv.js
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
    // CSV parsing implementation
  }
}

module.exports = { TXCsvSourceAdapter };
```

**No ADR required. Lock already authorizes the pattern.**

---

## 12. CLI Usage

### Ingestion

```bash
# NC (Excel)
node pipeline/ingest.js --source NC --file "Companies NC.xlsx"

# DE (CSV)
node pipeline/ingest.js --source DE --file "Delaware-Companies.csv"

# Dry run (no DB writes)
node pipeline/ingest.js --source DE --file data.csv --dry-run
```

### Verification & Minting

```bash
node pipeline/orchestrator.js --state NC
node pipeline/orchestrator.js --state DE
```

### Doctrine Verification

```bash
npm run doctrine:verify
```

---

## 13. Acceptance Criteria

| Criteria | Status |
|----------|--------|
| NC adapter extends StateCsvSourceAdapter | ✅ |
| DE adapter extends StateCsvSourceAdapter | ✅ |
| Compile-time guards execute on load | ✅ |
| Identity allowlist is frozen | ✅ |
| Admission gate is OR (not AND) | ✅ |
| State is injected, not parsed | ✅ |
| Documentation matches code | ✅ |
| Delaware CSV passes audit | ✅ |

---

## 14. Traceability

| Artifact | Reference |
|----------|-----------|
| ADR | ADR-006-multi-state-intake-doctrine-lock.md |
| Lock Contract | docs/doctrine/COMPANY_LIFECYCLE_LOCK.md |
| Base Adapter | pipeline/adapters/state_csv_adapter.js |
| NC Adapter | pipeline/adapters/source_nc_excel.js |
| DE Adapter | pipeline/adapters/source_de_csv.js |
| Ingest CLI | pipeline/ingest.js |

---

## 15. Approval

| Role | Name | Date |
|------|------|------|
| Hub Owner | SHQ | 2026-01-13 |
| Reviewer | | |
