# Outreach Hub Migration Guide

This guide is for the **outreach repo** to adopt the 4-hub architecture.

## Context

The Company Lifecycle (CL) repo now enforces sovereign identity with a gate:
- `identity_status = 'PASS'` = company is verified and can enter outreach
- `identity_status = 'FAIL'` = company failed verification
- `sovereign_id` = `company_unique_id` from `cl.company_identity`

## Current State (Outreach Repo)

You have existing tables:
```
outreach.company_target     (20,000 records)
outreach.people             (0 records)
outreach.engagement_events  (0 records)
outreach.column_registry    (48 records)
```

These use `company_unique_id` directly as the foreign key to CL.

## Target Architecture

```
outreach schema
├── outreach (master spine)
│   ├── outreach_id (PK)
│   └── sovereign_id (FK → cl.company_identity.company_unique_id)
│
├── company_target (sub-hub)
│   └── outreach_id (FK)
│
├── dol (sub-hub) - NEW
│   ├── outreach_id (FK)
│   ├── ein
│   ├── filing_present
│   ├── funding_type
│   ├── broker_or_advisor
│   └── carrier
│
├── outreach_people (sub-hub)
│   ├── outreach_id (FK)
│   ├── role (CEO|CFO|HR)
│   ├── person_id
│   ├── confidence
│   └── freshness
│
└── blog (sub-hub) - NEW
    ├── outreach_id (FK)
    ├── context_summary
    ├── source_type (blog|press|site|filing)
    ├── source_url
    └── context_timestamp
```

## Migration Options

### Option A: Add Master Spine (Recommended)

Create a new `outreach.outreach` table as the master spine, then migrate existing `company_target` to use `outreach_id` instead of `company_unique_id` directly.

```sql
-- 1. Create master spine
CREATE TABLE outreach.outreach (
    outreach_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sovereign_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_outreach_sovereign
        FOREIGN KEY (sovereign_id)
        REFERENCES cl.company_identity(company_unique_id)
        ON DELETE RESTRICT
);

-- 2. Populate from existing company_target
INSERT INTO outreach.outreach (sovereign_id, created_at)
SELECT DISTINCT
    company_unique_id::UUID,
    MIN(created_at)
FROM outreach.company_target
GROUP BY company_unique_id;

-- 3. Add outreach_id FK to company_target
ALTER TABLE outreach.company_target
ADD COLUMN outreach_id UUID;

UPDATE outreach.company_target ct
SET outreach_id = o.outreach_id
FROM outreach.outreach o
WHERE ct.company_unique_id::UUID = o.sovereign_id;

-- 4. Add FK constraint
ALTER TABLE outreach.company_target
ADD CONSTRAINT fk_target_outreach
    FOREIGN KEY (outreach_id)
    REFERENCES outreach.outreach(outreach_id);
```

### Option B: Keep Current Structure

If you prefer to keep `company_unique_id` as the direct FK:
- Rename it to `sovereign_id` for consistency
- Add the identity gate check before any inserts

## Identity Gate Enforcement

**CRITICAL**: Before inserting into outreach, verify the company is approved:

```sql
-- Check before insert
SELECT identity_status
FROM cl.company_identity
WHERE company_unique_id = $1;

-- Only proceed if identity_status = 'PASS'
```

Or use the eligibility view:
```sql
SELECT eligible_for_outreach
FROM cl.v_company_identity_eligible
WHERE company_unique_id = $1;
```

## New Sub-Hub Tables

### DOL (Department of Labor facts)

```sql
CREATE TABLE outreach.dol (
    dol_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outreach_id UUID NOT NULL REFERENCES outreach.outreach(outreach_id),
    ein TEXT,                          -- Employer Identification Number
    filing_present BOOLEAN,            -- DOL filing exists
    funding_type TEXT,                 -- 'self' | 'fully_insured' | 'unknown'
    broker_or_advisor TEXT,
    carrier TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Blog (Context signals)

```sql
CREATE TABLE outreach.blog (
    blog_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outreach_id UUID NOT NULL REFERENCES outreach.outreach(outreach_id),
    context_summary TEXT,              -- What can we reference in messaging?
    source_type TEXT,                  -- 'blog' | 'press' | 'site' | 'filing'
    source_url TEXT,
    context_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

## Data Flow

```
cl.company_identity (sovereign_id)
         │
         │ identity_status = 'PASS'
         ▼
outreach.outreach (outreach_id)
         │
    ┌────┼────┬────┬────┐
    ▼    ▼    ▼    ▼    ▼
  target dol people blog (future)
```

## Gate Rules

| Gate | Trigger | Enforcement |
|------|---------|-------------|
| CL → Outreach | `identity_status = 'PASS'` | Check before insert |
| Outreach → Sales | Human signal (meeting/reply) | Your logic |
| Sales → Client | Contract executed | Your logic |

## Questions?

Contact the CL repo maintainers for clarification on:
- Sovereign ID lookup patterns
- Eligibility view usage
- Error handling for gate failures
