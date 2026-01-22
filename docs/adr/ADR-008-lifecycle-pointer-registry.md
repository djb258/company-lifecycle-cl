# ADR-008: Lifecycle Pointer Registry

## Status
**Accepted** - 2026-01-22

## Context

CL is the sovereign authority for company identity. Sub-hubs (Outreach, Sales, Client) need to claim companies and track lifecycle progression. Previously, there was no standardized way for sub-hubs to register their claim on a company identity.

### Requirements
1. Sub-hubs must be able to register their ID against a company
2. Once registered, the pointer must be immutable (write-once)
3. Lifecycle stage must be derivable from pointer presence
4. UI consumers need a clean view of lifecycle status

## Decision

We extended `cl.company_identity` with write-once lifecycle pointer columns instead of creating new tables.

### Schema Extension

```sql
-- Pointer columns (nullable, write-once)
outreach_id UUID
sales_process_id UUID
client_id UUID

-- Timestamp metadata (auto-set on first write)
outreach_attached_at TIMESTAMPTZ
sales_opened_at TIMESTAMPTZ
client_promoted_at TIMESTAMPTZ
```

### Write-Once Enforcement

Database trigger `trg_write_once_pointers` enforces immutability:
- If pointer is NULL → can be set
- If pointer is non-NULL → cannot be changed or set to NULL
- Same-value writes are no-ops (allowed)
- Timestamps auto-set on first write

### UI View

`cl.v_company_lifecycle_status` exposes:
- `sovereign_company_id`, `company_name`, `company_domain`
- All pointer IDs and timestamps
- Derived booleans: `has_outreach`, `has_sales`, `is_client`
- Derived `lifecycle_stage`: PROSPECT → OUTREACH → SALES → CLIENT

## Implementation Details

### Trigger Logic

```sql
IF OLD.outreach_id IS NOT NULL
   AND NEW.outreach_id IS DISTINCT FROM OLD.outreach_id THEN
  RAISE EXCEPTION 'outreach_id is write-once and already set';
END IF;
```

### Lifecycle Stage Derivation

```sql
CASE
  WHEN client_id IS NOT NULL THEN 'CLIENT'
  WHEN sales_process_id IS NOT NULL THEN 'SALES'
  WHEN outreach_id IS NOT NULL THEN 'OUTREACH'
  ELSE 'PROSPECT'
END AS lifecycle_stage
```

### Indexes

Partial indexes on non-NULL pointers for efficient lookups:
```sql
CREATE INDEX idx_company_identity_outreach_id
  ON cl.company_identity(outreach_id) WHERE outreach_id IS NOT NULL;
```

## Consequences

### Positive
- Simple extension, no new tables
- Write-once semantics enforced at database level
- Clean view for UI consumers (Lovable.DAVE)
- Backward compatible (all new columns nullable)
- Lifecycle stage derived, not stored (always consistent)

### Negative
- Trigger overhead on updates (minimal for 51,910 rows)
- Cannot "unclaim" a company without admin intervention

### Neutral
- Sub-hubs must handle their own ID generation
- CL does not validate that pointer IDs exist in sub-hub tables

## Migration

- Migration 008: `neon/migrations/008_lifecycle_pointer_registry.sql`
- Applied to production: 2026-01-22
- Affected rows: 51,910 (all active companies)

## Related Documents

- [[ADR-005-four-hub-architecture]] - Hub structure
- [[PRD_COMPANY_LIFECYCLE]] - Core PRD
- [[CL_SCHEMA_ERD]] - Schema documentation
- [[DOWNSTREAM_SUB_HUB_HANDOFF]] - Sub-hub integration guide

## Scripts

| Script | Purpose |
|--------|---------|
| `neon/migrations/008_lifecycle_pointer_registry.sql` | Schema migration |
| `neon/apply-lifecycle-pointers.js` | Migration runner |
| `neon/test-write-once.js` | Trigger verification |
