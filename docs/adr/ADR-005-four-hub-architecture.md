# ADR-005: Four-Hub Architecture

## Status

**Accepted** - 2026-01-06

## Context

The Company Lifecycle system needed a clear data architecture that:
1. Establishes sovereign identity as the source of truth
2. Supports the full company lifecycle (intake → outreach → sales → client)
3. Enables multiple repos/systems to work together
4. Prevents data corruption through gate enforcement

Previous iterations had fragmented tables without clear ownership or stage gates.

## Decision

We adopt a **4-hub architecture** where each hub represents a lifecycle stage:

### Hub 1: company_cl (Sovereign Identity)

**Owner**: This repo (company-lifecycle-cl)

**Purpose**: Mint and verify sovereign identity

**Tables**:
- `cl.company_identity` - Single table for intake + validation + status
- `cl.company_identity_bridge` - Join surface for downstream
- `cl.identity_confidence` - Confidence envelope
- `cl.company_candidate` - Intake audit log
- `cl.company_names` - Name variants (sidecar)
- `cl.company_domains` - Domain facts (sidecar)
- `cl.cl_errors` - Unified error table

**Gate Out**: `identity_status = 'PASS'`

### Hub 2: outreach (Engagement)

**Owner**: Outreach repo

**Purpose**: Execute outreach campaigns

**Tables**:
- `outreach.outreach` - Master spine (outreach_id → sovereign_id)
- `outreach.company_target` - Email patterns
- `outreach.dol` - DOL/EIN regulatory facts
- `outreach.outreach_people` - CEO/CFO/HR contacts
- `outreach.blog` - Context signals

**Gate Out**: Human signal (meeting/reply)

### Hub 3: sales (Pipeline)

**Owner**: Lovable.dev (vault copy in Neon)

**Purpose**: Manage sales pipeline

**Tables**:
- `sales.opportunity` - Shell table

**Gate Out**: Contract executed

### Hub 4: client (Customers)

**Owner**: Lovable.dev (vault copy in Neon)

**Purpose**: Manage customer relationships

**Tables**:
- `client.client` - Shell table

## Sovereign ID Flow

```
sovereign_id (company_unique_id)
     │
     │  Generated at intake
     │  Official when identity_status = 'PASS'
     │
     ├─► outreach_id (FK to sovereign_id)
     │
     ├─► sales_id (FK to outreach_id)
     │
     └─► client_id (FK to outreach_id)
```

The sovereign_id is **immutable** and follows the company through its entire lifecycle.

## Gate Enforcement

### Database Level
- FK constraints prevent orphan records
- Trigger on `outreach.outreach` rejects non-PASS companies

### Application Level
- Neon Agent checks eligibility before promotion
- Clear error messages for gate failures

**Doctrine**: Agent decides, database prevents corruption.

## Consequences

### Positive
- Clear ownership per hub
- Immutable sovereign identity
- Auditable stage transitions
- Multiple repos can work independently
- No business logic in the database

### Negative
- Requires coordination between repos
- Some denormalization for performance
- Migration complexity for existing data

### Neutral
- Sales/Client are shell tables (source of truth in Lovable)
- Outreach repo manages its own schema migration

## Alternatives Considered

### Single Schema
All tables in one schema. Rejected because:
- No clear ownership
- No stage isolation
- Hard to enforce gates

### Microservice Per Stage
Separate databases per stage. Rejected because:
- Overkill for current scale
- Cross-database joins are slow
- Operational overhead

### No Gates (Trust Application)
Let applications manage transitions. Rejected because:
- No enforcement at data layer
- Easy to corrupt data accidentally
- Hard to audit

## References

- [PRD-NEON-AGENT](../prd/PRD-NEON-AGENT.md)
- [OUTREACH_MIGRATION_GUIDE](../OUTREACH_MIGRATION_GUIDE.md)
- [CL_DOCTRINE](../doctrine/CL_DOCTRINE.md)
