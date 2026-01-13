# IMO: Multi-State Company Intake

**Hub:** Company Lifecycle (CL)
**Hub ID:** HUB-CL-001
**IMO ID:** IMO-CL-006
**Date:** 2026-01-13
**Status:** IMPLEMENTED

---

## Overview

This IMO documents the multi-state company intake system with doctrine-lock enforcement.

---

## I — INGRESS

### Source Files

| Source | Format | Adapter |
|--------|--------|---------|
| NC Companies | Excel (.xlsx) | `NCExcelSourceAdapter` |
| DE Companies | CSV | `DECsvSourceAdapter` |
| TX Companies | CSV | `TXCsvSourceAdapter` (planned) |

### CSV Headers Expected

```
Name,Description,Primary Industry,Size,Type,Location,Country,Domain,LinkedIn URL
```

### Ingress Rules

1. All files enter via `pipeline/ingest.js` CLI
2. State is injected by adapter (NEVER parsed from CSV)
3. Adapter reads file and yields `CandidateRecord` objects
4. No business logic in ingress layer

### CLI Entry Point

```bash
node pipeline/ingest.js --source <STATE> --file <PATH> [--dry-run]
```

### Connectors

| Connector | Direction | Protocol |
|-----------|-----------|----------|
| File System | Inbound | Local file read |
| CLI Args | Inbound | Command line |

---

## M — MIDDLE (Logic Layer)

### State Machine

```
┌─────────────────┐
│  CSV FILE       │
│  (Source)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ SOURCE ADAPTER  │ ← Extends StateCsvSourceAdapter
│ - extractFields │
│ - transform     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ INTAKE SERVICE  │ ← Writes to company_candidate
│ - validate      │
│ - insert        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ LIFECYCLE WORKER│ ← Verification + Minting
│ - verifyCandidate│
│ - mintIdentity  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ COMPANY_IDENTITY│ ← Sovereign ID
│ (Output)        │
└─────────────────┘
```

### Invariants (LOCKED)

| Invariant | Enforcement |
|-----------|-------------|
| `state_code` explicit | Constructor throws |
| `source_system` unique | Registry collision |
| Identity allowlist | Frozen array |
| Verification before mint | `assertVerificationComplete()` |
| Admission gate | `domain OR linkedin` |

### Identity Field Allowlist

```javascript
['company_name', 'company_domain', 'linkedin_url']
```

**No other fields may influence identity.**

### Compile-Time Guards

| Guard | Location | Failure |
|-------|----------|---------|
| Adapter inheritance | `ingest.js` | `exit(1)` |
| Identity allowlist | `ingest.js` | `exit(1)` |
| State uniqueness | `StateCsvSourceAdapter` | throw |
| Source uniqueness | `StateCsvSourceAdapter` | throw |

### Decision Logic

| Decision | Rule |
|----------|------|
| Admission gate | `domain IS NOT NULL OR linkedin IS NOT NULL` |
| Name validation | `company_name IS NOT NULL AND length > 0` |
| Domain validation | Valid format, not generic email domain |
| LinkedIn validation | Valid `/company/` URL format |
| Identity minting | Only after `verification.passed = true` |

### Tools (M-Layer)

| Tool ID | Tool Name | Purpose |
|---------|-----------|---------|
| CL-TOOL-010 | StateCsvSourceAdapter | Base class with invariants |
| CL-TOOL-011 | assertAdapterInheritance | Compile-time guard |
| CL-TOOL-012 | assertIdentityFieldAllowlist | Compile-time guard |
| CL-TOOL-013 | getCsvContract | Contract specification |

---

## O — EGRESS

### Database Tables

| Table | Schema | Purpose |
|-------|--------|---------|
| `company_candidate` | cl | Staging (pre-sovereign) |
| `company_identity` | cl | Sovereign identities |
| `company_identity_bridge` | cl | Source ↔ Sovereign mapping |

### Output Schema

```sql
-- After minting
INSERT INTO cl.company_identity (
  company_name,
  company_domain,
  linkedin_company_url,
  source_system,
  state_code
) VALUES ($1, $2, $3, $4, $5)
RETURNING company_unique_id;
```

### Downstream Handoff

| Consumer | FK Used |
|----------|---------|
| Outreach | `company_unique_id` |
| Sales | `company_unique_id` |
| Client | `company_unique_id` |

### Notifications

| Event | Trigger |
|-------|---------|
| Ingestion complete | CLI output |
| Minting complete | CLI output |
| Guard failure | `process.exit(1)` |

---

## Traceability

| Artifact | Reference |
|----------|-----------|
| ADR | ADR-006-multi-state-intake-doctrine-lock.md |
| PRD | PRD-MULTI-STATE-INTAKE.md |
| Lock Contract | COMPANY_LIFECYCLE_LOCK.md |
| Base Adapter | pipeline/adapters/state_csv_adapter.js |
| Ingest CLI | pipeline/ingest.js |
| Checklist | HUB_COMPLIANCE.md |

---

## Adding New States

### Steps

1. Create adapter file: `pipeline/adapters/source_XX_csv.js`
2. Extend `StateCsvSourceAdapter`
3. Declare: `state_code`, `source_system`, `state_name`
4. Register in `ADAPTERS` map in `ingest.js`
5. Compile-time guards verify automatically

### Template

```javascript
const { StateCsvSourceAdapter } = require('./state_csv_adapter');

class XXCsvSourceAdapter extends StateCsvSourceAdapter {
  constructor() {
    super({
      source_system: 'XX_CSV_SSXXX',
      state_code: 'XX',
      state_name: 'State Name',
    });
  }

  async *read(options) {
    // Implementation
  }
}

module.exports = { XXCsvSourceAdapter };
```

**No ADR required. Lock authorizes the pattern.**

---

## Approval

| Role | Name | Date |
|------|------|------|
| Hub Owner | SHQ | 2026-01-13 |
