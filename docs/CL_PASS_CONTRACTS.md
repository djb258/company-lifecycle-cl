# CL Identity Funnel - Pass Contracts (LOCKED)

> **Doctrine:** Cost-first, accuracy-second. Every pass gates the next.
> **Version:** 1.0 (FROZEN)
> **Last Updated:** 2026-01-02

---

## Mental Model Lock

CL is the **identity forge** for ~70,000 companies.

**CL IS:**
- Identity truth
- Identity coherence
- Identity match surfaces

**CL IS NOT:**
- Outreach
- Discovery
- Scoring
- Execution

Downstream hubs assume CL is authoritative.

---

## Schema (FROZEN)

```
┌─────────────────────────────────────────────────────────────────┐
│                    cl.company_identity                          │
│                      (SPINE TABLE)                              │
│  company_unique_id | company_name | company_domain | ...        │
│  existence_verified | canonical_name | state_verified           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
   │ company_names │ │company_domains│ │identity_conf  │
   │  (SIDECAR)    │ │  (SIDECAR)    │ │  (ENVELOPE)   │
   └───────────────┘ └───────────────┘ └───────────────┘
                           │
                           ▼
                   ┌───────────────┐
                   │  cl_errors    │
                   │  (UNIFIED)    │
                   │ pass_name=... │
                   └───────────────┘
```

**Tables (exactly 5):**
1. `cl.company_identity` — spine
2. `cl.company_names` — sidecar (canonical + aliases)
3. `cl.company_domains` — sidecar (domain health & coherence)
4. `cl.cl_errors` — unified error table with `pass_name`
5. `cl.identity_confidence` — confidence envelope

---

## Pass Order (LOCKED)

| Pass | Name | Status |
|------|------|--------|
| 1 | Existence Verification | COMPLETE |
| 2 | Name Canonicalization | COMPLETE |
| 3 | Domain-Name Coherence | COMPLETE |
| 4 | Collision Detection | COMPLETE |
| 5 | Firmographic Coherence | COMPLETE |

---

## PASS 1: Existence Verification

**Status:** COMPLETE
**Purpose:** Prove the company exists via domain resolution

### Contract

| Field | Spec |
|-------|------|
| **Pass Name** | `existence` |
| **Input** | `cl.company_identity` WHERE `existence_verified IS NULL` |
| **Output (PASS)** | `existence_verified = TRUE`, `domain_status_code`, `name_match_score` |
| **Output (FAIL)** | Row in `cl.cl_errors` with `pass_name = 'existence'` |
| **Side Effects** | Populates `cl.company_domains`, seeds `cl.identity_confidence` |
| **Idempotency** | Skip if `existence_verified IS NOT NULL` |
| **Cost Ceiling** | 0 (local HTTP only) |

### Success Criteria
- Domain returns HTTP 200-399 (live site)
- HTTP 403 accepted (site exists, blocks bots)

### Failure Codes
| Code | Meaning |
|------|---------|
| `DOMAIN_TIMEOUT` | No response within 10s |
| `DOMAIN_CONNECTION_REFUSED` | Server rejected connection |
| `DOMAIN_DNS_FAIL` | Domain doesn't resolve |
| `DOMAIN_SSL_ERROR` | SSL certificate invalid |
| `DOMAIN_HTTP_ERROR` | HTTP 4xx/5xx (except 403) |

### Confidence Scoring
```
existence_verified=TRUE AND name_match >= 70  → HIGH (80 pts)
existence_verified=TRUE AND name_match >= 40  → MEDIUM (60 pts)
existence_verified=TRUE AND name_match < 40   → LOW (50 pts)
existence_verified=FALSE                      → UNVERIFIED (20 pts)
```

---

## PASS 2: Name Canonicalization & Alias Extraction

**Status:** PENDING
**Purpose:** Collapse name ambiguity via deterministic normalization

### Contract

| Field | Spec |
|-------|------|
| **Pass Name** | `name` |
| **Input** | `cl.company_identity` WHERE `existence_verified = TRUE` |
| **Output** | Rows in `cl.company_names` |
| **Side Effect** | Updates `cl.company_identity.canonical_name` |
| **Idempotency** | Skip company if already has rows in `cl.company_names` |
| **Cost Ceiling** | 0 (regex only, no LLMs) |

### Name Types
| Type | Description |
|------|-------------|
| `canonical` | Primary cleaned name |
| `legal` | With legal suffix (Inc, LLC) |
| `dba` | "Doing Business As" variant |
| `brand` | Marketing/brand name |
| `normalized` | Lowercase, no suffixes, no punctuation |

### Normalization Rules
1. Strip legal suffixes: `Inc`, `LLC`, `Corp`, `Ltd`, `Co`, `LP`, `LLP`, `PLLC`, `PC`, `PA`
2. Normalize whitespace (collapse multiple spaces)
3. Handle ampersand: `&` → `and`
4. Normalize quotes: `'` `'` `"` `"` → standard ASCII
5. Strip trailing punctuation
6. Trim leading/trailing whitespace

### Failure Codes
| Code | Meaning |
|------|---------|
| `NAME_EMPTY` | No extractable name after normalization |
| `NAME_TOO_SHORT` | Name < 2 characters |
| `NAME_INVALID_CHARS` | Contains invalid characters only |

### Confidence Impact
- Canonical name extracted: +5 pts
- Multiple aliases found: +5 pts

---

## PASS 3: Domain ↔ Name Coherence

**Status:** PENDING
**Purpose:** Ensure domain actually belongs to the company

### Contract

| Field | Spec |
|-------|------|
| **Pass Name** | `domain` |
| **Input** | `cl.company_domains` WHERE `domain_health = 'LIVE'` |
| **Output** | Updates `cl.company_domains.domain_name_confidence` |
| **Idempotency** | Skip if `domain_name_confidence IS NOT NULL` |
| **Cost Ceiling** | 0 (string matching only) |

### Coherence Algorithm
1. Extract domain name (strip TLD, www, hyphens)
2. Tokenize: `acme-corp.com` → `['acme', 'corp']`
3. Compare tokens against:
   - `canonical_name` tokens
   - All `company_names` entries
4. Score: `matched_tokens / total_tokens * 100`

### Confidence Scoring
| Score | Bucket | Meaning |
|-------|--------|---------|
| 80-100 | HIGH | Domain clearly matches company |
| 50-79 | MEDIUM | Partial match, plausible |
| 20-49 | LOW | Weak match, needs review |
| 0-19 | MISMATCH | Domain doesn't match name |

### Failure Codes
| Code | Meaning |
|------|---------|
| `DOMAIN_NAME_MISMATCH` | Confidence < 20 |
| `DOMAIN_GENERIC` | Domain is generic (e.g., `info.com`) |

### Confidence Impact
- domain_name_confidence >= 80: +10 pts
- domain_name_confidence >= 50: +5 pts
- domain_name_confidence < 20: -10 pts

---

## PASS 4: Collision Detection & Resolution

**Status:** PENDING
**Purpose:** Eliminate duplicate identities

### Contract

| Field | Spec |
|-------|------|
| **Pass Name** | `collision` |
| **Input** | All `cl.company_identity` rows |
| **Output** | Collision errors in `cl.cl_errors` |
| **Idempotency** | Re-scan allowed; skip already-resolved |
| **Cost Ceiling** | LLM usage < 3% of records, feature-flagged |

### Detection Rules (Deterministic First)
1. **Domain collision:** Same domain → multiple `company_unique_id`
2. **Name collision:** Normalized name match > 95%
3. **LinkedIn collision:** Same `linkedin_company_url`

### Resolution Order
1. **Deterministic:** Older `created_at` wins
2. **Heuristic:** More complete record wins (count non-null fields)
3. **LLM (gated):** Only if deterministic fails, logged

### LLM Gate Rules
- Feature flag: `ENABLE_LLM_COLLISION_RESOLUTION`
- Max 3% of records
- All LLM calls logged to `inputs_snapshot`
- Fallback: Mark as `COLLISION_UNRESOLVED`

### Failure Codes
| Code | Meaning |
|------|---------|
| `COLLISION_DOMAIN` | Duplicate domain detected |
| `COLLISION_NAME` | Near-identical name (>95%) |
| `COLLISION_LINKEDIN` | Duplicate LinkedIn URL |
| `COLLISION_UNRESOLVED` | Could not resolve deterministically |

### Confidence Impact
- Unresolved collision: -20 pts
- Resolved (merged): No change to winner

---

## PASS 5: Firmographic Coherence (NOT Enrichment)

**Status:** PENDING
**Purpose:** Detect contradictions, NOT add data

### Contract

| Field | Spec |
|-------|------|
| **Pass Name** | `firmographic` |
| **Input** | `cl.company_identity` WHERE `confidence_bucket IN ('HIGH', 'MEDIUM')` |
| **Output** | Updates `cl.company_identity.state_verified` |
| **Idempotency** | Skip if `state_verified IS NOT NULL` |
| **Cost Ceiling** | 0 (validation only, no API calls) |

### Validation Checks
1. **State coherence:** `address_state` matches domain WHOIS or LinkedIn
2. **Employee band sanity:** Band is within plausible range for company type
3. **Self-consistency:** No contradictory fields

### What This Pass Does NOT Do
- No external API calls
- No data enrichment
- No web crawling
- No new data sources

### Failure Codes
| Code | Meaning |
|------|---------|
| `FIRMOGRAPHIC_STATE_MISMATCH` | State conflicts with other signals |
| `FIRMOGRAPHIC_EMPLOYEE_IMPLAUSIBLE` | Employee count doesn't make sense |
| `FIRMOGRAPHIC_SELF_CONFLICT` | Internal data contradictions |

### Confidence Impact
- All checks pass: +5 pts
- State verified: +5 pts
- Any conflict: -10 pts

---

## Error Doctrine (NON-NEGOTIABLE)

All failures write to `cl.cl_errors`:

```sql
INSERT INTO cl.cl_errors (
  company_unique_id,    -- nullable if pre-mint
  lifecycle_run_id,     -- required
  pass_name,            -- required: existence|name|domain|collision|firmographic
  failure_reason_code,  -- required
  inputs_snapshot,      -- JSONB with relevant inputs
  created_at            -- auto
)
```

**Rules:**
- No retries inside CL
- Repairs are explicit re-runs only
- `resolved_at` set when error is fixed

---

## Confidence Envelope Recomputation

After each full funnel run, recompute all confidence scores:

```sql
UPDATE cl.identity_confidence
SET
  confidence_score = <computed>,
  confidence_bucket = CASE
    WHEN <computed> >= 70 THEN 'HIGH'
    WHEN <computed> >= 40 THEN 'MEDIUM'
    WHEN <computed> >= 20 THEN 'LOW'
    ELSE 'UNVERIFIED'
  END,
  computed_at = now()
```

### Scoring Formula
```
Base: 20 (existence verified) or 0 (not verified)
+ existence_verified=TRUE AND name_match >= 70: +60
+ existence_verified=TRUE AND name_match >= 40: +40
+ existence_verified=TRUE AND name_match < 40: +30
+ canonical_name extracted: +5
+ multiple aliases: +5
+ domain_name_confidence >= 80: +10
+ domain_name_confidence >= 50: +5
+ domain_name_confidence < 20: -10
+ unresolved_collision: -20
+ firmographic_verified: +5
+ firmographic_conflict: -10
```

---

## Cost & Safety Rules

### Execution Order
1. Deterministic first
2. Cheapest first
3. LLMs last (gated, logged)

### Batch Requirements
- All passes must batch execute
- Minimum batch size: 100
- Maximum batch size: 1000

### Per-Pass Metrics (Required)
| Metric | Description |
|--------|-------------|
| `processed` | Total records attempted |
| `pass` | Successful completions |
| `fail` | Errors written |
| `skip` | Idempotent skips |
| `escalation_rate` | % requiring LLM |
| `cost_usd` | API costs if any |

### Kill Switches
| Trigger | Action |
|---------|--------|
| Error rate > 50% | Pause, alert |
| LLM usage > 5% | Disable LLM, continue deterministic |
| Timeout > 30s/record avg | Pause, alert |

---

## Current State (Post-Funnel)

| Metric | Count |
|--------|-------|
| Total companies | 71,820 |
| Existence verified | 9,494 |
| Canonical names | 9,486 |
| `cl.company_names` | 14,133 |
| `cl.company_domains` | 70,298 |
| Live domains | 8,030 |
| `cl.cl_errors` | 11,113 |
| HIGH confidence | 4,809 |
| MEDIUM confidence | 4,530 |
| LOW confidence | 155 |
| UNVERIFIED | 62,326 |

---

## Execution Plan

1. **Pass 2 (Name):** ~9,500 verified companies
2. **Pass 3 (Domain):** ~70,000 live domains
3. **Pass 4 (Collision):** Full corpus scan
4. **Pass 5 (Firmographic):** HIGH + MEDIUM only
5. **Confidence Recompute:** All records

---

## Appendix: Schema DDL (Reference)

```sql
-- Sidecar: Names
CREATE TABLE cl.company_names (
  name_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_unique_id UUID NOT NULL REFERENCES cl.company_identity,
  name_value TEXT NOT NULL,
  name_type TEXT NOT NULL CHECK (name_type IN ('canonical','legal','dba','brand','normalized')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_unique_id, name_value, name_type)
);

-- Sidecar: Domains
CREATE TABLE cl.company_domains (
  domain_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_unique_id UUID NOT NULL REFERENCES cl.company_identity,
  domain TEXT NOT NULL,
  domain_health TEXT CHECK (domain_health IN ('LIVE','DEAD','REDIRECT','PARKED','UNKNOWN')),
  mx_present BOOLEAN,
  domain_name_confidence INT,
  checked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_unique_id, domain)
);

-- Unified Errors
CREATE TABLE cl.cl_errors (
  error_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_unique_id UUID,
  lifecycle_run_id TEXT NOT NULL,
  pass_name TEXT NOT NULL CHECK (pass_name IN ('existence','name','domain','collision','firmographic')),
  failure_reason_code TEXT NOT NULL,
  inputs_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Confidence Envelope
CREATE TABLE cl.identity_confidence (
  company_unique_id UUID PRIMARY KEY REFERENCES cl.company_identity,
  confidence_score INT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  confidence_bucket TEXT NOT NULL CHECK (confidence_bucket IN ('HIGH','MEDIUM','LOW','UNVERIFIED')),
  computed_at TIMESTAMPTZ DEFAULT now()
);
```
