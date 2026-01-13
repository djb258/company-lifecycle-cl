# Downstream Sub-Hub Handoff Document

**Source Hub:** Company Lifecycle (CL)
**Hub ID:** HUB-CL-001
**Version:** 1.0
**Date:** 2026-01-13
**Purpose:** Enable downstream sub-hubs to inherit CL doctrine and continue the pattern

---

## How to Use This Document

**Copy this entire file to your downstream repo.** It contains everything needed to:

1. Understand Company Lifecycle's identity authority
2. Consume sovereign company IDs correctly
3. Implement the same doctrine-lock pattern for your sub-hub
4. Avoid common mistakes that break the system

---

## Part 1: Company Lifecycle Overview

### What CL Does

CL is the **sovereign identity authority** for companies in the Barton Outreach system.

```
SOURCE DATA (CSV)
    │
    ▼
┌─────────────────────────────────────┐
│       COMPANY LIFECYCLE (CL)        │
│                                     │
│  • Intake raw company data          │
│  • Verify existence (domain check)  │
│  • Mint sovereign identity (UUID)   │
│  • Enforce admission gate           │
│                                     │
└──────────────┬──────────────────────┘
               │
               │  company_unique_id (UUID)
               │  ← THIS IS THE ONLY THING
               │    DOWNSTREAM SYSTEMS USE
               ▼
┌─────────────────────────────────────┐
│        DOWNSTREAM SUB-HUBS          │
│                                     │
│  • Outreach (engagement)            │
│  • People (employment)              │
│  • DOL (sponsor matching)           │
│  • Blog (content)                   │
│  • Sales (pipeline)                 │
│  • Client (customers)               │
│                                     │
└─────────────────────────────────────┘
```

### What CL Produces

| Output | Type | Description |
|--------|------|-------------|
| `company_unique_id` | UUID | **Sovereign identity** — use this as FK |
| `company_name` | TEXT | Display name |
| `company_domain` | TEXT | Website domain (nullable) |
| `linkedin_company_url` | TEXT | LinkedIn page (nullable) |
| `confidence_bucket` | ENUM | HIGH / MEDIUM / LOW / UNVERIFIED |

### Database Connection

```
Host: ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech
Database: Marketing DB
Schema: cl
SSL: Required
```

---

## Part 2: Rules for Downstream Sub-Hubs

### MUST DO

1. **Use `company_unique_id` as your FK** — This is the ONLY valid reference to a company
2. **Wait for CL verification** — Only consume companies where `identity_status = 'PASS'`
3. **Read-only access to CL tables** — Never INSERT/UPDATE/DELETE in `cl.*`
4. **Handle NULL anchors** — Domain may be NULL (use LinkedIn), LinkedIn may be NULL (use domain)
5. **Filter by confidence** — Start with HIGH/MEDIUM, avoid UNVERIFIED

### MUST NOT

1. **Never create your own company IDs** — CL is the only identity authority
2. **Never modify company identity** — No re-minting, no updates to identity fields
3. **Never assume both anchors exist** — At least one (domain OR linkedin) exists, not necessarily both
4. **Never bypass CL** — All company data flows through CL first
5. **Never back-propagate changes** — Data flows ONE WAY from CL downstream

### Query Pattern

```sql
-- Get companies for your sub-hub
SELECT
  ci.company_unique_id AS sovereign_id,
  ci.company_name,
  ci.company_domain,
  ci.linkedin_company_url,
  ic.confidence_bucket
FROM cl.company_identity ci
LEFT JOIN cl.identity_confidence ic
  ON ci.company_unique_id = ic.company_unique_id
WHERE ci.identity_status = 'PASS'
  AND ic.confidence_bucket IN ('HIGH', 'MEDIUM')
ORDER BY ic.confidence_score DESC;
```

---

## Part 3: CL Doctrine Lock (The Pattern)

CL uses a **doctrine lock** pattern to ensure consistency. **Your sub-hub should implement the same pattern.**

### The Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    BASE CLASS                               │
│                                                             │
│  • Declares required fields explicitly                      │
│  • Enforces invariants in constructor                       │
│  • Registers unique identifiers                             │
│  • Freezes field allowlists                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ extends
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 CONCRETE ADAPTER/HANDLER                    │
│                                                             │
│  • Declares hub_id, sub_hub_id, etc.                       │
│  • Inherits all invariants automatically                    │
│  • Cannot bypass parent checks                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ verified by
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  COMPILE-TIME GUARDS                        │
│                                                             │
│  • Execute at module load                                   │
│  • Fail fast with process.exit(1)                          │
│  • Prevent runtime violations                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### CL Implementation (Reference)

```javascript
// Base class enforces invariants
class StateCsvSourceAdapter extends SourceAdapter {
  constructor(config) {
    // INVARIANT 1: state_code required
    if (!config.state_code) {
      throw new Error('INVARIANT VIOLATION: state_code MUST be declared');
    }

    // INVARIANT 2: source_system required
    if (!config.source_system) {
      throw new Error('INVARIANT VIOLATION: source_system MUST be declared');
    }

    // INVARIANT 3: No duplicates
    if (REGISTRY.has(config.state_code)) {
      throw new Error('INVARIANT VIOLATION: Duplicate state_code');
    }

    // Register and continue
    REGISTRY.set(config.state_code, this.constructor.name);
    super(config);
  }
}

// Concrete adapter inherits all checks
class DECsvSourceAdapter extends StateCsvSourceAdapter {
  constructor() {
    super({
      state_code: 'DE',          // REQUIRED
      source_system: 'DE_CSV',   // REQUIRED
      state_name: 'Delaware',    // REQUIRED
    });
  }
}
```

---

## Part 4: Sub-Hub Lock Template

**Copy and adapt this template for your sub-hub.**

### Base Class Template

```javascript
/**
 * SubHub Base Class
 *
 * DOCTRINE-LOCK: All handlers must extend this class.
 *
 * INVARIANTS:
 * 1. sub_hub_id MUST be explicitly declared
 * 2. parent_hub_id MUST reference CL
 * 3. Required fields are frozen
 * 4. No duplicate sub_hub_id allowed
 */

const REGISTRY = new Map();

const REQUIRED_FIELDS = Object.freeze([
  // Define your required fields here
  'company_unique_id',  // FK to CL
  // Add sub-hub specific required fields
]);

class SubHubBaseHandler {
  constructor(config) {
    // INVARIANT 1: sub_hub_id required
    if (!config.sub_hub_id) {
      throw new Error('INVARIANT VIOLATION: sub_hub_id MUST be declared');
    }

    // INVARIANT 2: parent_hub_id must be CL
    if (config.parent_hub_id !== 'HUB-CL-001') {
      throw new Error('INVARIANT VIOLATION: parent_hub_id must be HUB-CL-001');
    }

    // INVARIANT 3: No duplicates
    if (REGISTRY.has(config.sub_hub_id)) {
      throw new Error(`INVARIANT VIOLATION: ${config.sub_hub_id} already registered`);
    }

    REGISTRY.set(config.sub_hub_id, this.constructor.name);

    this.sub_hub_id = config.sub_hub_id;
    this.parent_hub_id = config.parent_hub_id;
    this.sub_hub_name = config.sub_hub_name;
  }

  /**
   * Validate that company exists in CL
   * MUST be called before any operation
   */
  async validateCompanyExists(company_unique_id, pool) {
    const result = await pool.query(
      'SELECT 1 FROM cl.company_identity WHERE company_unique_id = $1 AND identity_status = $2',
      [company_unique_id, 'PASS']
    );

    if (result.rows.length === 0) {
      throw new Error(
        `INVARIANT VIOLATION: company_unique_id ${company_unique_id} ` +
        'does not exist in CL or is not PASS status'
      );
    }

    return true;
  }
}

function getRequiredFields() {
  return REQUIRED_FIELDS;
}

module.exports = { SubHubBaseHandler, getRequiredFields };
```

### Compile-Time Guards Template

```javascript
/**
 * Compile-time guards for sub-hub
 * Add to your main entry point
 */

const { SubHubBaseHandler, getRequiredFields } = require('./base_handler');

function assertHandlerInheritance(HandlerClass, name) {
  const instance = new HandlerClass();

  if (!(instance instanceof SubHubBaseHandler)) {
    throw new Error(
      `COMPILE-TIME GUARD FAILURE: ${name} must extend SubHubBaseHandler`
    );
  }

  if (!instance.sub_hub_id) {
    throw new Error(
      `COMPILE-TIME GUARD FAILURE: ${name} missing sub_hub_id`
    );
  }

  console.log(`[GUARD] ✓ ${name} passed (${instance.sub_hub_id})`);
}

function assertRequiredFields() {
  const fields = getRequiredFields();

  if (!fields.includes('company_unique_id')) {
    throw new Error(
      'COMPILE-TIME GUARD FAILURE: company_unique_id must be in required fields'
    );
  }

  console.log('[GUARD] ✓ Required fields include company_unique_id');
}

// Execute at module load
try {
  console.log('[DOCTRINE-LOCK] Running compile-time guards...');

  assertRequiredFields();
  assertHandlerInheritance(YourConcreteHandler, 'YourConcreteHandler');

  console.log('[DOCTRINE-LOCK] ✓ All guards passed');
} catch (error) {
  console.error('DOCTRINE-LOCK BUILD FAILURE:', error.message);
  process.exit(1);
}
```

---

## Part 5: Sub-Hub Specific Guidance

### People Sub-Hub

**Purpose:** Bind people (employees) to companies

**Required Fields:**
- `company_unique_id` (FK to CL) — REQUIRED
- `person_linkedin_url` — Identity anchor
- `person_name` — Display name
- `role_title` — Job title

**Invariants:**
1. Cannot create person record without valid `company_unique_id`
2. Company must be PASS status in CL before binding
3. Person identity is separate from company identity
4. Employment is a RELATIONSHIP, not identity

**Lifecycle:**
```
CL company_identity (PASS)
    │
    ▼
People Sub-Hub
    │
    ├── Validate company exists in CL
    ├── Create person identity
    ├── Bind person to company (employment)
    │
    ▼
Employment record created
```

### DOL Sub-Hub

**Purpose:** Match companies to DOL sponsor requirements

**Required Fields:**
- `company_unique_id` (FK to CL) — REQUIRED
- `sponsor_status` — Eligibility status

**Invariants:**
1. Cannot evaluate sponsor status without valid company
2. DOL logic reads CL, never writes
3. Sponsor matching is CLASSIFICATION, not identity

### Outreach Sub-Hub

**Purpose:** Manage engagement campaigns

**Required Fields:**
- `company_unique_id` (FK to CL) — REQUIRED
- `outreach_status` — Campaign status
- `last_contacted_at` — Engagement timestamp

**Invariants:**
1. Cannot create outreach record without valid company
2. Use `confidence_bucket` to prioritize targets
3. Outreach status is EXECUTION, not identity

---

## Part 6: Lifecycle Order (System-Wide)

```
┌─────────────────────────────────────────────────────────────┐
│                         LEVEL 1                             │
│                                                             │
│  CSV Intake → CL Verification → Sovereign Identity Minted   │
│                                                             │
│  company_unique_id is now AUTHORITATIVE                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ GATE: identity_status = 'PASS'
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                         LEVEL 2                             │
│                                                             │
│  Company Target → Classification & Readiness                │
│  DOL → Sponsor Matching                                     │
│  Blog → Content Eligibility                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ GATE: Company classified
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                         LEVEL 3                             │
│                                                             │
│  People → Employment Binding                                │
│  Outreach → Engagement Campaigns                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ GATE: Outreach executed
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                         LEVEL 4                             │
│                                                             │
│  Sales → Pipeline Management                                │
│  Client → Customer Conversion                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**No sub-hub may skip levels. No sub-hub may back-propagate.**

---

## Part 7: Checklist for New Sub-Hub

Copy this checklist to your sub-hub repo:

```markdown
## Sub-Hub Compliance Checklist

### CL Integration
- [ ] Uses `company_unique_id` as FK
- [ ] Validates company exists in CL before operations
- [ ] Only consumes companies with `identity_status = 'PASS'`
- [ ] Handles NULL domain (uses LinkedIn)
- [ ] Handles NULL LinkedIn (uses domain)
- [ ] No writes to cl.* tables

### Doctrine Lock
- [ ] Base class created with invariant enforcement
- [ ] All handlers extend base class
- [ ] Required fields frozen
- [ ] Compile-time guards implemented
- [ ] Guards execute at module load

### Documentation
- [ ] ADR created for sub-hub decisions
- [ ] PRD created for sub-hub requirements
- [ ] IMO documented (Ingress/Middle/Egress)
- [ ] Checklist completed

### Traceability
- [ ] Parent hub documented: HUB-CL-001
- [ ] FK documented: company_unique_id
- [ ] Lifecycle level documented
```

---

## Part 8: Summary

### CL Gives You

| What | How to Access |
|------|---------------|
| Sovereign company ID | `company_unique_id` |
| Company name | `company_name` |
| Domain (nullable) | `company_domain` |
| LinkedIn (nullable) | `linkedin_company_url` |
| Confidence score | `cl.identity_confidence` |
| Verification status | `identity_status = 'PASS'` |

### You Give Downstream

| What | Your Table |
|------|-----------|
| Your sub-hub's FK | Your `_id` column |
| Classification data | Your domain tables |
| Execution status | Your status columns |

### The Pattern

1. **Base class** enforces invariants at construction
2. **Concrete handlers** extend base and declare identifiers
3. **Compile-time guards** verify at module load
4. **Allowlists** are frozen to prevent scope creep
5. **No manual audits** — the lock is self-enforcing

---

## Contact

| Question | Contact |
|----------|---------|
| CL schema questions | CL Hub (SHQ) |
| Integration issues | Check this handoff first |
| Doctrine questions | Review ADR-006 |

---

**This document is the contract. Follow it exactly.**
