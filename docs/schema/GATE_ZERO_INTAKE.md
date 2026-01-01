# cl.gate_zero_intake — Schema Documentation

**Schema:** `cl`
**Table:** `gate_zero_intake`
**Status:** Doctrine-Locked
**Last Documented:** 2025-12-31

---

## 1. Table Description

The `cl.gate_zero_intake` table is the **entry point for company candidates** awaiting identity verification in Gate Zero.

Each row represents a single intake attempt from a source list (Clay, Apollo, CSV import, etc.). Records in this table are **pre-sovereign** — they have no `sovereign_company_id` and cannot be referenced by downstream hubs until they pass Gate Zero and are minted by the Sovereign Mint Worker.

**This table represents:**
- A company candidate awaiting existence verification
- The claimed identity anchors (domain, LinkedIn, state)
- The source system and batch that originated the record
- The current processing status

**This table does NOT represent:**
- Sovereign company identity (that's `cl.company_identity`)
- Verified/authoritative company data
- Enrichment or augmented data
- Lifecycle state (OUTREACH, SALES, CLIENT, RETIRED)

---

## 2. Column Descriptions

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `intake_id` | UUID | NO | Unique identifier for this intake attempt. Auto-generated upon insert. This is the **only** identifier Gate Zero uses. |
| `company_name` | TEXT | NO | Claimed company name from source list. Used for display, not matching. |
| `company_domain` | TEXT | NO | Claimed primary web domain. Must be provided; used for existence verification. |
| `linkedin_company_url` | TEXT | NO | Claimed LinkedIn company page URL. Must be provided; used for existence and state verification. |
| `intake_state` | TEXT | NO | Claimed US state code (e.g., 'VA', 'MD'). Must match LinkedIn location for PASS. |
| `source_system` | TEXT | NO | Origin system that provided this candidate (e.g., 'clay', 'apollo', 'csv_import'). |
| `batch_id` | TEXT | YES | Optional batch identifier for annual imports or grouped processing. |
| `intake_status` | TEXT | NO | Current status: `PENDING`, `PROCESSING`, `AUTHORIZED`, `FAILED`, `REENTER_SUCCEEDED`. |
| `created_at` | TIMESTAMPTZ | NO | Timestamp when intake was received. Auto-set to current time upon insert. |
| `processed_at` | TIMESTAMPTZ | YES | Timestamp when Gate Zero last processed this record. Null if never processed. |

---

## 3. Column Semantics

### Primary Identifier
| Column | Role |
|--------|------|
| `intake_id` | **Intake primary key.** Used exclusively by Gate Zero. Never referenced after sovereignty is minted. |

### Identity Anchors (All Required)
| Column | Role |
|--------|------|
| `company_domain` | Required. Domain to verify company web presence. |
| `linkedin_company_url` | Required. LinkedIn page to verify existence and state. |
| `intake_state` | Required. Claimed state to match against LinkedIn location. |

### Descriptive Attributes
| Column | Role |
|--------|------|
| `company_name` | Required. Display name from source list. |

### Processing Metadata
| Column | Role |
|--------|------|
| `source_system` | Required. Provenance tracking. |
| `batch_id` | Optional. Groups records from same import. |
| `intake_status` | Required. Current processing status. |
| `created_at` | Required. When intake was received. |
| `processed_at` | Optional. When last processed by Gate Zero. |

---

## 4. Status Values

| Status | Description |
|--------|-------------|
| `PENDING` | Awaiting Gate Zero processing. |
| `PROCESSING` | Currently being verified by Gate Zero. |
| `AUTHORIZED` | Passed Gate Zero. AUTH event emitted. Awaiting Mint Worker. |
| `FAILED` | Failed Gate Zero. Routed to recovery table. |
| `REENTER_SUCCEEDED` | Original failed record superseded by successful re-entry. |

---

## 5. Immutability & Invariants

### Immutable Columns (NEVER change after insert)

| Column | Immutability |
|--------|--------------|
| `intake_id` | **IMMUTABLE.** Once assigned, permanent for lifetime of record. |
| `source_system` | **IMMUTABLE.** Reflects original source. |
| `batch_id` | **IMMUTABLE.** Reflects original batch. |
| `created_at` | **IMMUTABLE.** Reflects moment of intake. |

### Updatable Columns (Via Gate Zero processing only)

| Column | Mutability |
|--------|------------|
| `intake_status` | Updated by Gate Zero processing. |
| `processed_at` | Updated on each processing attempt. |

### Correctable Columns (Pre-processing only)

| Column | Mutability |
|--------|------------|
| `company_name` | May be corrected before processing. |
| `company_domain` | May be corrected before processing. |
| `linkedin_company_url` | May be corrected before processing. |
| `intake_state` | May be corrected before processing. |

**Note:** Once `intake_status` leaves `PENDING`, identity anchor columns become effectively immutable. Corrections require a new intake attempt.

### Table-Level Invariants

| Invariant | Description |
|-----------|-------------|
| **Unique Intake ID** | No two rows may share the same `intake_id`. |
| **All Anchors Required** | Every row must have `company_domain`, `linkedin_company_url`, and `intake_state`. |
| **No Deletion** | Rows are never deleted. Failed rows remain for audit. |
| **Pre-Sovereignty** | This table has no relationship to `sovereign_company_id`. |
| **Status Progression** | Status only moves forward: PENDING → PROCESSING → AUTHORIZED/FAILED. |

---

## 6. Data Format Expectations

### intake_id
```
Format: UUID v4 (auto-generated)
Example: 7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d
Case: Lowercase with hyphens
Generation: gen_random_uuid() — do NOT supply manually
```

### company_name
```
Format: Free text, UTF-8
Example: "Acme Corporation"
Case: Title case preferred, not enforced
Length: Practical limit ~500 characters
```

### company_domain
```
Format: Domain only, no protocol, no path
Example: "acme.com" (correct)
Example: "https://acme.com" (INCORRECT)
Case: Lowercase only
Normalization: Strip www., strip trailing dots
```

### linkedin_company_url
```
Format: Full LinkedIn company page URL
Example: "https://www.linkedin.com/company/acme-corp"
Case: Lowercase preferred
Invalid: Personal profiles, showcase pages, school pages
```

### intake_state
```
Format: Two-letter US state code, uppercase
Example: "VA", "MD", "CA"
Case: Uppercase only
Valid: Standard USPS state abbreviations
```

### source_system
```
Format: Lowercase identifier, snake_case
Example: "clay", "apollo", "csv_import", "manual_entry"
```

### batch_id
```
Format: Free text identifier
Example: "2025_annual_outreach", "clay_import_20251231"
Purpose: Groups records for batch-level operations
```

### intake_status
```
Format: Uppercase enum
Valid: PENDING, PROCESSING, AUTHORIZED, FAILED, REENTER_SUCCEEDED
```

---

## 7. AI Usage Notes

### How to Read This Table Correctly

**Purpose:** When you need to check intake status or retrieve pending candidates for Gate Zero processing.

**Query pattern for pending records:**
```sql
SELECT intake_id, company_name, company_domain, linkedin_company_url, intake_state
FROM cl.gate_zero_intake
WHERE intake_status = 'PENDING'
ORDER BY created_at ASC
```

**Query pattern for batch processing:**
```sql
SELECT intake_id, company_name
FROM cl.gate_zero_intake
WHERE batch_id = '2025_annual_outreach'
  AND intake_status = 'PENDING'
```

### What This Table Tells You

- Whether a company candidate has entered the pipeline
- The claimed identity anchors to verify
- Current processing status
- Which source/batch originated the record

### What This Table Does NOT Tell You

- Whether the company exists (that's what Gate Zero verifies)
- Sovereign company identity (pre-sovereignty)
- Verification results (see Gate Zero AIR)
- Recovery status (see `gate_zero_recovery`)

### Correct Usage Pattern

```
1. Source system submits company candidate
2. Record inserted into gate_zero_intake with status PENDING
3. Gate Zero processes: status → PROCESSING
4. Existence check runs
5a. If PASS → status = AUTHORIZED, AUTH event to AIR
5b. If FAIL → status = FAILED, record to gate_zero_recovery
6. Mint Worker reads AUTHORIZED records via AIR subscription
```

### Anti-Patterns (Do NOT Do These)

| Anti-Pattern | Why Wrong |
|--------------|-----------|
| Reference `sovereign_company_id` | Gate Zero is pre-sovereignty; this field doesn't exist |
| Skip status updates | Must track PENDING → PROCESSING → AUTHORIZED/FAILED |
| Update anchors after PROCESSING | Corrections require new intake attempt |
| Delete failed records | Failed rows preserved for audit |
| Process same `intake_id` twice | Once processed, status is terminal |

---

## 8. SQL Comments (Apply to Database)

```sql
-- Table comment
COMMENT ON TABLE cl.gate_zero_intake IS
'Entry point for company candidates awaiting Gate Zero verification. Each row is a pre-sovereign intake attempt. Uses intake_id only; has no relationship to sovereign_company_id.';

-- Column comments
COMMENT ON COLUMN cl.gate_zero_intake.intake_id IS
'Unique identifier for this intake attempt. Auto-generated UUID. NEVER change.';

COMMENT ON COLUMN cl.gate_zero_intake.company_name IS
'Claimed company name from source list. Display only, not used for matching.';

COMMENT ON COLUMN cl.gate_zero_intake.company_domain IS
'Claimed primary web domain. Required. Used for existence verification.';

COMMENT ON COLUMN cl.gate_zero_intake.linkedin_company_url IS
'Claimed LinkedIn company page URL. Required. Used for existence and state verification.';

COMMENT ON COLUMN cl.gate_zero_intake.intake_state IS
'Claimed US state code (e.g., VA, MD). Must match LinkedIn location for PASS.';

COMMENT ON COLUMN cl.gate_zero_intake.source_system IS
'Origin system that provided this candidate. Immutable. Audit purpose.';

COMMENT ON COLUMN cl.gate_zero_intake.batch_id IS
'Optional batch identifier for grouped processing.';

COMMENT ON COLUMN cl.gate_zero_intake.intake_status IS
'Current status: PENDING, PROCESSING, AUTHORIZED, FAILED, REENTER_SUCCEEDED.';

COMMENT ON COLUMN cl.gate_zero_intake.created_at IS
'Timestamp when intake was received. Immutable. Always UTC.';

COMMENT ON COLUMN cl.gate_zero_intake.processed_at IS
'Timestamp when Gate Zero last processed this record. Null if never processed.';
```

---

**Documentation Version:** 1.0
**Table Version:** 001
