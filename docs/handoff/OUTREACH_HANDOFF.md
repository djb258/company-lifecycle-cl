# Outreach Handoff — Company Lifecycle Sovereign Identity

**From:** Company Lifecycle (CL) Hub
**To:** Outreach Hub / Company Target
**Date:** 2026-01-01
**Status:** READY FOR CONSUMPTION

---

## 1. Executive Summary

The Company Lifecycle (CL) hub has minted **71,820 sovereign company identities**, including **10,739 new NC (North Carolina) companies**.

Outreach may now begin targeting these companies using the sovereign identity (`company_sov_id`) as the canonical reference.

---

## 2. Database Connection

| Field | Value |
|-------|-------|
| **Host** | `ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech` |
| **Database** | `Marketing DB` |
| **Schema** | `cl` |
| **SSL** | Required (`sslmode=require`) |

**Credentials:** Use Doppler (`doppler run`) or environment variable `DATABASE_URL` / `VITE_DATABASE_URL`

---

## 3. Tables Available

### 3.1 Primary Tables

| Table | Schema | Records | Purpose |
|-------|--------|---------|---------|
| `company_identity` | cl | 71,820 | **Sovereign identities (USE THIS)** |
| `company_identity_bridge` | cl | 71,820 | Source ↔ Sovereign mapping |

### 3.2 Reference Only (Do Not Write)

| Table | Schema | Purpose |
|-------|--------|---------|
| `company_lifecycle_identity_staging` | cl | Intake staging (CL internal) |
| `company_lifecycle_error` | cl | Error routing (CL internal) |
| `company_master` | company | Source data (READ-ONLY) |

---

## 4. Schema Reference

### 4.1 cl.company_identity (Sovereign Identity)

This is the **primary table** for company identity. Use `company_unique_id` as your foreign key.

```sql
CREATE TABLE cl.company_identity (
  company_unique_id     UUID PRIMARY KEY,      -- SOVEREIGN ID (use this!)
  company_name          TEXT NOT NULL,         -- Company display name
  company_domain        TEXT,                  -- Website domain (nullable)
  linkedin_company_url  TEXT,                  -- LinkedIn URL (nullable)
  company_fingerprint   TEXT,                  -- Idempotency key
  source_system         TEXT NOT NULL,         -- Origin system (clay, apollo, etc.)
  lifecycle_run_id      TEXT,                  -- Batch identifier
  created_at            TIMESTAMPTZ NOT NULL   -- Mint timestamp
);
```

**Key Fields:**
- `company_unique_id` — The sovereign ID. **This is your FK.**
- `company_name` — Always populated
- `company_domain` — May be NULL (some companies have only LinkedIn)
- `linkedin_company_url` — May be NULL (some companies have only domain)

**Constraint:** At least one of `company_domain` or `linkedin_company_url` is always present.

### 4.2 cl.company_identity_bridge (Join Surface)

Use this table to map between source IDs and sovereign IDs.

```sql
CREATE TABLE cl.company_identity_bridge (
  bridge_id           UUID PRIMARY KEY,
  source_company_id   TEXT NOT NULL UNIQUE,    -- Original source ID
  company_sov_id      UUID NOT NULL UNIQUE,    -- → cl.company_identity
  source_system       TEXT NOT NULL,
  lifecycle_run_id    TEXT,
  minted_at           TIMESTAMPTZ NOT NULL,
  minted_by           TEXT NOT NULL
);
```

---

## 5. Query Patterns

### 5.1 Get All NC Companies (New Batch)

```sql
SELECT
  company_unique_id AS sovereign_id,
  company_name,
  company_domain,
  linkedin_company_url
FROM cl.company_identity
WHERE lifecycle_run_id LIKE 'RUN-NC-%';
```

**Returns:** 10,739 rows

### 5.2 Get All Sovereign Companies

```sql
SELECT
  company_unique_id AS sovereign_id,
  company_name,
  company_domain,
  linkedin_company_url,
  source_system,
  created_at
FROM cl.company_identity
ORDER BY created_at DESC;
```

**Returns:** 71,820 rows

### 5.3 Join Pattern (Canonical)

When you need to map back to source IDs:

```sql
SELECT
  b.source_company_id,
  b.company_sov_id AS sovereign_id,
  i.company_name,
  i.company_domain,
  i.linkedin_company_url
FROM cl.company_identity_bridge b
JOIN cl.company_identity i ON b.company_sov_id = i.company_unique_id
WHERE i.lifecycle_run_id LIKE 'RUN-NC-%';
```

### 5.4 Lookup by Domain

```sql
SELECT company_unique_id, company_name, linkedin_company_url
FROM cl.company_identity
WHERE company_domain = 'epicgames.com';
```

### 5.5 Lookup by LinkedIn

```sql
SELECT company_unique_id, company_name, company_domain
FROM cl.company_identity
WHERE linkedin_company_url ILIKE '%epic-games%';
```

---

## 6. Doctrine Rules (MUST FOLLOW)

### 6.1 Use Sovereign ID as FK

```
✅ DO:   Store company_sov_id (UUID) as your foreign key
❌ DON'T: Store source_company_id or create your own IDs
```

### 6.2 Join Through Bridge

```
✅ DO:   Join via cl.company_identity_bridge when mapping to source
❌ DON'T: Join directly to company.company_master
```

### 6.3 Read-Only Access

```
✅ DO:   SELECT from cl.company_identity
❌ DON'T: INSERT, UPDATE, or DELETE in cl.* tables
```

### 6.4 Identity Anchor Rule

Companies may have:
- Domain only (LinkedIn is NULL)
- LinkedIn only (Domain is NULL)
- Both domain and LinkedIn

**At least one is always present.** Do not assume both exist.

---

## 7. Data Quality Notes

### 7.1 NC Batch Statistics

| Metric | Value |
|--------|-------|
| Total in Excel | 11,427 |
| Gate Zero PASS | 11,420 |
| Gate Zero FAIL | 7 |
| Duplicates Skipped | 681 |
| **Sovereign IDs Minted** | **10,739** |

### 7.2 Failure Reasons (7 records)

These companies failed Gate Zero and are in `cl.company_lifecycle_error`:
- Missing identity anchor (no domain AND no LinkedIn)
- State validation failures

### 7.3 Duplicates (681 records)

These were intentionally skipped because:
- Same domain already existed in system
- Same LinkedIn URL already existed in system

This is correct behavior — one sovereign ID per company.

---

## 8. State Coverage

Companies are currently available for these states:

| State | Code | Status |
|-------|------|--------|
| PA | 42 | Available |
| VA | 51 | Available |
| MD | 24 | Available |
| OH | 39 | Available |
| WV | 54 | Available |
| KY | 21 | Available |
| DE | 10 | Available |
| OK | 40 | Available |
| **NC** | **37** | **NEW (10,739 companies)** |

---

## 9. Sample Data

### 9.1 NC Companies (First 5)

| Sovereign ID | Company | Domain |
|--------------|---------|--------|
| `5d2e8ee9-39ab-4521-b63f-80fd96a4c882` | Planet Pharma | planet-pharma.com |
| `55cc632e-9602-4231-a6e7-1ed2bab0bbeb` | Epic Games | epicgames.com |
| `6f46754f-f5c9-42b9-b2ee-760d1e685b78` | Center for Creative Leadership | ccl.org |
| `352507f5-b76c-42dd-bf47-73f83f8cf5d9` | SPECTRAFORCE | spectraforce.com |
| `7e4b8613-64c5-41da-a2c0-cb32eba02a49` | insightsoftware | insightsoftware.com |

---

## 10. Integration Checklist

Before starting outreach, confirm:

- [ ] Database connection established
- [ ] Can query `cl.company_identity` successfully
- [ ] Outreach tables use `company_sov_id` (UUID) as FK
- [ ] No direct references to `company.company_master`
- [ ] Handle NULL domain (use LinkedIn)
- [ ] Handle NULL LinkedIn (use domain)

---

## 11. Support & Escalation

| Issue | Contact |
|-------|---------|
| Data quality issues | CL Hub (SHQ) |
| Missing companies | Check `cl.company_lifecycle_error` |
| Schema questions | See `docs/schema/CL_ERD.md` |
| Doctrine questions | See `docs/adr/ADR-003-identity-anchor-state-expansion.md` |

---

## 12. Traceability

| Artifact | Reference |
|----------|-----------|
| NC Pipeline Run | `RUN-NC-2026-01-01T17-46-16` |
| ADR | ADR-003 (Identity Anchor & State Expansion) |
| ERD | `docs/schema/CL_ERD.md` |
| Doctrine | `docs/doctrine/CL_DOCTRINE.md` |

---

## Approval

| Role | Name | Date |
|------|------|------|
| CL Hub Owner | SHQ | 2026-01-01 |
| Outreach Lead | | |

---

**Handoff Status:** COMPLETE

Outreach may begin targeting NC companies immediately using sovereign IDs from `cl.company_identity`.
