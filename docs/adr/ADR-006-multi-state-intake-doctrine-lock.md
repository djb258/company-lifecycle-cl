# ADR: Multi-State Intake Doctrine Lock

## ADR Identity

| Field | Value |
|-------|-------|
| **ADR ID** | ADR-006 |
| **Status** | [x] Accepted |
| **Date** | 2026-01-13 |

---

## Owning Hub

| Field | Value |
|-------|-------|
| **Hub Name** | Company Lifecycle Hub |
| **Hub ID** | HUB-CL-001 |

---

## Scope

| Layer | Affected |
|-------|----------|
| I — Ingress | [x] |
| M — Middle | [x] |
| O — Egress | [ ] |

---

## Context

The Company Lifecycle (CL) system was initially built with North Carolina (NC) as the first state source stream. As the system expands to additional states (Delaware, Texas, etc.), we need to ensure:

1. All states flow through the same identity rules
2. No state can bypass verification or admission gates
3. State-specific logic is isolated to adapters only
4. Identity fields are locked to prevent scope creep
5. Documentation matches executable code

Without formal locking, each new state risks introducing:
- Custom identity logic
- Bypassed verification
- Documentation drift
- Inconsistent admission gates

---

## Decision

**A permanent Doctrine Lock is established for Company Lifecycle intake.**

The lock consists of:

### 1. StateCsvSourceAdapter Base Class

All state adapters MUST extend `StateCsvSourceAdapter` which enforces:

- `state_code` explicitly declared (never parsed from CSV)
- `source_system` explicitly declared (unique per adapter)
- Identity fields restricted to allowlist
- Adapter registry prevents duplicates

### 2. CSV Contract (Global)

| Field | Requirement |
|-------|-------------|
| `Name` | REQUIRED |
| `Domain` | At least one required |
| `LinkedIn URL` | At least one required |
| All other fields | Optional → `raw_payload` only |

**Admission Gate:** `company_domain IS NOT NULL OR linkedin_url IS NOT NULL`

### 3. Identity Field Allowlist (FROZEN)

```javascript
const IDENTITY_FIELD_ALLOWLIST = Object.freeze([
  'company_name',
  'company_domain',
  'linkedin_url',
]);
```

No other fields may influence identity decisions.

### 4. Compile-Time Guards

Guards execute at module load in `pipeline/ingest.js`:

| Guard | Failure Mode |
|-------|--------------|
| Adapter extends base | `process.exit(1)` |
| `state_code` valid | `process.exit(1)` |
| `source_system` declared | `process.exit(1)` |
| Identity allowlist locked | `process.exit(1)` |
| No duplicate state_code | Constructor throws |
| No duplicate source_system | Constructor throws |

### 5. Lifecycle Order (Hard Gate)

```
CSV Intake → company_candidate → verification → company_identity → downstream
```

`assertVerificationComplete()` prevents minting without passed verification.

---

## Alternatives Considered

| Option | Why Not Chosen |
|--------|----------------|
| Per-state configuration files | Would require runtime validation; compile-time is safer |
| Shared adapter with state parameter | Risks state-specific logic leaking into shared code |
| No enforcement (trust operators) | Human error inevitable at scale |
| Database-level constraints only | Doesn't prevent pre-insertion logic violations |

---

## Consequences

### Enables

- Any new state adapter inherits all invariants automatically
- No audit required for new states
- Documentation cannot drift from code (guards enforce)
- State-specific logic is fully isolated
- Identity decisions are deterministic and auditable

### Prevents

- Identity fields expanding without ADR
- States bypassing verification
- Admission gate being weakened
- Operators accidentally breaking invariants
- Silent state_code collisions

---

## Registered Adapters (Current)

| State | Adapter | Source System | Status |
|-------|---------|---------------|--------|
| NC | `NCExcelSourceAdapter` | `NC_EXCEL_SS001` | Active |
| DE | `DECsvSourceAdapter` | `DE_CSV_SS002` | Active |

---

## Adding Future States

To add a new state:

1. Create adapter extending `StateCsvSourceAdapter`
2. Declare explicit `state_code` and `source_system`
3. Register in `pipeline/ingest.js` ADAPTERS map
4. Compile-time guards verify compliance
5. No ADR required (lock already authorizes pattern)

---

## Traceability

| Artifact | Reference |
|----------|-----------|
| Base Adapter | `pipeline/adapters/state_csv_adapter.js` |
| NC Adapter | `pipeline/adapters/source_nc_excel.js` |
| DE Adapter | `pipeline/adapters/source_de_csv.js` |
| Ingestion CLI | `pipeline/ingest.js` |
| Lock Contract | `docs/doctrine/COMPANY_LIFECYCLE_LOCK.md` |
| Gate Zero Schema | `docs/schema/GATE_ZERO_INTAKE.md` |

---

## Audit Verification (2026-01-13)

Delaware CSV audit passed:

| Check | Result |
|-------|--------|
| `Name` field present | ✅ PASS |
| `Domain OR LinkedIn` present | ✅ PASS |
| Optional fields to raw_payload | ✅ PASS |
| State injection (not parsed) | ✅ PASS |
| Admission gate satisfiable | ✅ PASS |
| Identity allowlist locked | ✅ PASS |
| Compile-time guards pass | ✅ PASS |

---

## Approval

| Role | Name | Date |
|------|------|------|
| Hub Owner | SHQ | 2026-01-13 |
| Reviewer | | |
