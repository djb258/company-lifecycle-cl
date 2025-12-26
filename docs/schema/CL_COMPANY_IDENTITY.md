# cl.company_identity — Schema Documentation

**Schema:** `cl`
**Table:** `company_identity`
**Status:** Doctrine-Locked
**Last Documented:** 2025-12-26

---

## 1. Table Description

The `cl.company_identity` table is the **sovereign identity registry** for companies within the Company Lifecycle (CL) system.

Each row represents a single, unique company that has been formally admitted into the CL ecosystem. A record in this table is the **prerequisite** for any downstream system (Outreach, Sales, Client, Weewee.me, Shenandoah Valley Group) to reference that company.

**This table represents:**
- The existence of a company as a recognized entity
- The canonical name of that company
- One or more identity anchors (domain and/or LinkedIn URL)
- The system that originated the record
- When the identity was minted

**This table does NOT represent:**
- Lifecycle state (OUTREACH, SALES, CLIENT, RETIRED)
- Promotion history
- Enrichment data
- Contact information
- Business relationships
- Any operational or transactional data

---

## 2. Column Descriptions

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `company_unique_id` | UUID | NO | The sovereign, globally unique identifier for this company. Auto-generated upon insert. This is the **only** identifier that downstream systems should use to reference this company. |
| `company_name` | TEXT | NO | The canonical, human-readable name of the company. This is the authoritative display name, not a legal entity name or DBA. |
| `company_domain` | TEXT | YES | The primary web domain associated with this company. Used as an identity anchor for matching and deduplication. |
| `linkedin_company_url` | TEXT | YES | The LinkedIn company page URL for this company. Used as an identity anchor when domain is unavailable or ambiguous. |
| `source_system` | TEXT | NO | The system or process that originated this identity record. Used for audit and provenance tracking. |
| `created_at` | TIMESTAMPTZ | NO | The timestamp when this identity was minted. Auto-set to current time upon insert. |

---

## 3. Column ID Semantics

### Primary Identifier
| Column | Role |
|--------|------|
| `company_unique_id` | **Sovereign primary key.** All downstream references MUST use this value. |

### Identity Anchors (At Least One Required)
| Column | Role |
|--------|------|
| `company_domain` | Optional identity anchor. If present, should be unique per company. |
| `linkedin_company_url` | Optional identity anchor. If present, should be unique per company. |

**Admission Gate:** At least ONE of `company_domain` or `linkedin_company_url` MUST be non-null. Records with neither are rejected by constraint.

### Descriptive Attributes
| Column | Role |
|--------|------|
| `company_name` | Required descriptive attribute. Human-readable label. |

### Metadata
| Column | Role |
|--------|------|
| `source_system` | Required metadata. Provenance tracking. |
| `created_at` | Required metadata. Temporal anchor. |

---

## 4. Immutability & Invariants

### Immutable Columns (NEVER change after insert)

| Column | Immutability |
|--------|--------------|
| `company_unique_id` | **IMMUTABLE.** Once assigned, this value is permanent for the lifetime of the record and beyond (even after retirement). |
| `created_at` | **IMMUTABLE.** Reflects the moment of identity minting. |
| `source_system` | **IMMUTABLE.** Reflects the original source. |

### Correctable Columns (May be updated with audit)

| Column | Mutability |
|--------|------------|
| `company_name` | Correctable. May be updated if the original name was incorrect. |
| `company_domain` | Correctable. May be updated if domain changes or was incorrect. |
| `linkedin_company_url` | Correctable. May be updated if URL changes or was incorrect. |

### Table-Level Invariants

| Invariant | Description |
|-----------|-------------|
| **Unique ID** | No two rows may share the same `company_unique_id`. |
| **Admission Gate** | Every row must have at least one of `company_domain` or `linkedin_company_url`. |
| **No Deletion** | Rows are never deleted. Identity retirement is handled via lifecycle state (not in this table). |
| **Single Source of Truth** | This table is the ONLY place where `company_unique_id` is minted. |

---

## 5. Data Format Expectations

### company_unique_id
```
Format: UUID v4 (auto-generated)
Example: 3249de9e-26d4-482a-b498-540a5e5db73e
Case: Lowercase with hyphens
Generation: gen_random_uuid() — do NOT supply manually
```

### company_name
```
Format: Free text, UTF-8
Example: "Acme Corporation"
Case: Title case preferred, not enforced
Length: Practical limit ~500 characters
Avoid: Leading/trailing whitespace, control characters
```

### company_domain
```
Format: Domain only, no protocol, no path
Example: "acme.com" (correct)
Example: "https://acme.com" (INCORRECT)
Example: "acme.com/about" (INCORRECT)
Case: Lowercase only
Normalization: Strip www., strip trailing dots
```

### linkedin_company_url
```
Format: Full LinkedIn company page URL
Example: "https://www.linkedin.com/company/acme-corp"
Example: "https://linkedin.com/company/12345" (numeric ID also valid)
Case: Lowercase preferred
Invalid: Personal profiles, showcase pages, school pages
```

### source_system
```
Format: Lowercase identifier, snake_case preferred
Example: "outreach", "clay_import", "manual_entry", "weewee_intake"
Purpose: Identifies the origin system for audit
```

### created_at
```
Format: ISO 8601 timestamp with timezone
Example: 2025-12-26T11:45:00.000Z
Timezone: Always stored as UTC
Generation: Auto-set via now() — do NOT supply manually
```

---

## 6. AI Usage Notes

### How to Read This Table Correctly

**Purpose:** When you need to verify a company exists in CL or retrieve its sovereign identifier.

**Query pattern for lookup by domain:**
```sql
SELECT company_unique_id, company_name
FROM cl.company_identity
WHERE company_domain = 'example.com'
```

**Query pattern for lookup by LinkedIn:**
```sql
SELECT company_unique_id, company_name
FROM cl.company_identity
WHERE linkedin_company_url LIKE '%linkedin.com/company/example%'
```

### What This Table Tells You

- Whether a company has been formally admitted to CL
- The sovereign ID to use for all downstream references
- The canonical name to display
- When the company was first recognized

### What This Table Does NOT Tell You

- Current lifecycle state (OUTREACH/SALES/CLIENT/RETIRED)
- Whether the company is active or retired
- Any enrichment or business data
- Contact information or people associated

### Correct Usage Pattern

```
1. External system has a company candidate
2. Check if company_domain or linkedin_company_url exists in cl.company_identity
3. If YES → Use existing company_unique_id
4. If NO → Request CL to mint new identity (do NOT insert directly)
5. Reference company_unique_id in all downstream operations
```

### Anti-Patterns (Do NOT Do These)

| Anti-Pattern | Why Wrong |
|--------------|-----------|
| Generate your own UUID and insert | Violates sovereign minting authority |
| Store company_unique_id as mutable | ID is permanent; design accordingly |
| Assume domain uniqueness | Multiple companies may share domain (rare but possible) |
| Query without identity anchor | Always filter by domain or linkedin, never scan full table |
| Use company_name as identifier | Names are not unique; always use company_unique_id |

---

## 7. SQL Comments (Apply to Database)

```sql
-- Table comment
COMMENT ON TABLE cl.company_identity IS
'Sovereign identity registry for Company Lifecycle (CL). Each row represents a formally admitted company. The company_unique_id is the only identifier downstream systems should use. This table does NOT contain lifecycle state, enrichment data, or operational information.';

-- Column comments
COMMENT ON COLUMN cl.company_identity.company_unique_id IS
'Sovereign, globally unique, immutable identifier. Auto-generated UUID. NEVER change or reuse.';

COMMENT ON COLUMN cl.company_identity.company_name IS
'Canonical human-readable company name. May be corrected if originally incorrect.';

COMMENT ON COLUMN cl.company_identity.company_domain IS
'Primary web domain (no protocol, lowercase). Identity anchor. At least one of domain or linkedin required.';

COMMENT ON COLUMN cl.company_identity.linkedin_company_url IS
'LinkedIn company page URL. Identity anchor. At least one of domain or linkedin required.';

COMMENT ON COLUMN cl.company_identity.source_system IS
'Origin system that created this identity. Immutable. Used for audit and provenance.';

COMMENT ON COLUMN cl.company_identity.created_at IS
'Timestamp when identity was minted. Immutable. Always UTC.';
```

---

**Documentation Version:** 1.0
**Table Version:** 001 (001_cl_company_identity.sql)
