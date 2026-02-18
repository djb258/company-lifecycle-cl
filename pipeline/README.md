# Company Lifecycle Pipeline

**Sovereign Intake Engine v2.0**

## Doctrine

```
STATE IS DATA, NOT CODE.
NC IS SOURCE STREAM #001, NOT SPECIAL.
ALL STATES USE THE SAME VERIFICATION LOGIC.
IDENTITY MINTING ONLY AFTER VERIFIED STATUS.
```

## INVARIANT (LOCKED)

> **If any code path mints an identity without passing through
> `cl.company_candidate → verifyCandidate()`, the build is invalid.**

This invariant is enforced by:
1. `assertVerificationComplete()` guard in lifecycle_worker.js
2. CI pipeline guard blocking deprecated file imports
3. CI pipeline guard blocking direct identity table writes

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOURCE ADAPTERS                               │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │ NC Excel      │  │ TX API        │  │ FL CSV        │        │
│  │ (SS-001)      │  │ (SS-002)      │  │ (SS-003)      │        │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘        │
│          │                  │                  │                 │
│          ▼                  ▼                  ▼                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              CandidateRecord                             │    │
│  │  { source_system, source_record_id, state_code,         │    │
│  │    raw_payload, company_name, company_domain }           │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INTAKE SERVICE                                │
│  - Writes to cl.company_candidate                               │
│  - verification_status = 'PENDING'                              │
│  - NO verification logic here                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-STATE ORCHESTRATOR                      │
│  - SELECT DISTINCT state_code FROM cl.company_candidate         │
│  - Process each state deterministically                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LIFECYCLE WORKER                              │
│  - Query pending candidates by state_code                       │
│  - Apply STATE-AGNOSTIC verification                            │
│  - Mint identity only after VERIFIED                            │
│  - Link candidate to company_unique_id                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    cl.company_identity                           │
│  - SOVEREIGN identity table                                     │
│  - company_unique_id = minted identity                          │
│  - state_code = DATA from candidate                             │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### Source Adapters

Base class for all source adapters. Each adapter:
- Reads from its source (Excel, API, CSV, etc.)
- Produces standard `CandidateRecord` objects
- Embeds `state_code` in every record

```javascript
const { NCExcelSourceAdapter } = require('./pipeline');

const adapter = new NCExcelSourceAdapter();
for await (const record of adapter.read({ filePath: 'nc_data.xlsx' })) {
  console.log(record);
  // {
  //   source_system: 'nc_sos_excel',
  //   source_record_id: '123456',
  //   state_code: 'NC',
  //   raw_payload: { ... },
  //   company_name: 'Acme Corp',
  //   company_domain: 'acme.com'
  // }
}
```

### Intake Service

Ingests candidates from adapters into `cl.company_candidate`.

```javascript
const { IntakeService, NCExcelSourceAdapter } = require('./pipeline');

const intake = new IntakeService();
const adapter = new NCExcelSourceAdapter();

const result = await intake.ingest(adapter, { filePath: 'nc_data.xlsx' });
// {
//   ingestion_run_id: 'uuid',
//   records_read: 1000,
//   records_inserted: 950,
//   records_skipped: 50
// }
```

### Lifecycle Worker

Processes pending candidates and mints identities.

```javascript
const { LifecycleWorker } = require('./pipeline');

const worker = new LifecycleWorker();

// Process single state
const result = await worker.runLifecyclePipeline({
  state_code: 'NC',
  batch_size: 100
});
// {
//   processed: 100,
//   verified: 85,
//   failed: 15,
//   minted: 85
// }
```

### Multi-State Orchestrator

Orchestrates processing across all states.

```javascript
const { MultiStateOrchestrator } = require('./pipeline');

const orchestrator = new MultiStateOrchestrator({
  batchSize: 100,
  dryRun: false
});

const result = await orchestrator.run();
// {
//   states_processed: 3,
//   aggregate: {
//     total_processed: 500,
//     total_verified: 450,
//     total_failed: 50,
//     total_minted: 450
//   }
// }
```

## CLI Usage

### Step 1: Ingest Source Data

```bash
# Ingest NC Excel file
node pipeline/ingest.js --source NC --file "Companies NC.xlsx"

# Dry run (no database commits)
node pipeline/ingest.js --source NC --file data.xlsx --dry-run
```

### Step 2: Verify and Mint Identities

```bash
# Process all pending states
node pipeline/orchestrator.js

# Process single state
node pipeline/orchestrator.js --state NC

# Dry run (no database commits)
node pipeline/orchestrator.js --dry-run

# Custom batch size
node pipeline/orchestrator.js --batch-size 50
```

### Complete Workflow

```bash
# 1. Ingest source data into cl.company_candidate
node pipeline/ingest.js --source NC --file "Companies NC.xlsx"

# 2. Verify candidates and mint identities
node pipeline/orchestrator.js --state NC
```

## Verification Rules (State-Agnostic)

**The only question: Is this company real?**

A sovereign ID means "yes, this company exists." Three ways to prove it:

### Admission Gate (any ONE path is sufficient)

| Path | Proof | Example Source |
|------|-------|----------------|
| **Domain/LinkedIn** | Company has a website or LinkedIn page | Hunter.IO, Clay, web enrichment |
| **DOL 5500 + EIN** | Company filed a federal 5500 form — you can't file one without being a real company | DOL data (source_system contains 'DOL') |
| **Web search verification** | Claude Code searches the company name + city + state and finds evidence it exists | Any source missing domain/LinkedIn/5500 |

### Additional Checks (all paths)

1. **Company Name**: Must be non-empty
2. **Domain Format**: Must be valid domain format (if provided)
3. **LinkedIn Format**: Must be valid LinkedIn company URL (if provided)
4. **No Generic Domains**: gmail.com, yahoo.com, etc. rejected

### Database Constraint

```sql
-- cl.company_identity admission gate
CHECK (
  company_domain IS NOT NULL
  OR linkedin_company_url IS NOT NULL
  OR source_system LIKE '%DOL%'
)
```

### Key Lesson

Domain discovery is **enrichment**, not **verification**. Don't waste time hunting
domains to prove a company is real. A DOL 5500 filing IS the proof. A web search
confirming the company exists IS the proof. Domains are useful later for outreach
(Hunter.IO email patterns), but they are not required for sovereign ID minting.

---

## State Onboarding Playbook

### Step 1: Get the Data

Source data can come from:
- DOL 5500 filings (federal, all states)
- State SOS (Secretary of State) records
- Hunter.IO / Clay enrichment exports
- Any commercial data provider

### Step 2: Ingest

```bash
# Create adapter if needed (see adapters/ directory for examples)
# Ingest into cl.company_candidate
node pipeline/ingest.js --source [STATE] --file [PATH]
```

### Step 3: Verify and Mint

```bash
# Run orchestrator — processes all PENDING candidates
node pipeline/orchestrator.js --batch-size 200
```

**What happens automatically:**
- Candidates with domains/LinkedIn → verified immediately
- DOL-sourced candidates with EINs → verified immediately (5500 = real company)
- Everything else → stays FAILED, needs enrichment

### Step 4: Enrich Remaining (if needed)

For FAILED candidates without domains/LinkedIn/5500:

1. **Apply exclusion filters** — skip non-commercial entities (government, schools, churches, etc.)
   ```bash
   node pipeline/filter_and_count.js
   ```

2. **Web search verification** — Claude Code searches company name + city + state
   - If the company shows up (website, Google Maps, reviews, news), it's real
   - Update `raw_payload` with discovered domain if found
   - Reset to PENDING and re-run orchestrator

3. **Bulk domain update** (for batches)
   ```bash
   # Edit pipeline/update_domains.js with discovered EIN→domain mappings
   node pipeline/update_domains.js
   node pipeline/orchestrator.js --batch-size 200
   ```

### Step 5: Domain Discovery (Post-Minting)

After sovereign IDs are minted, domains are still valuable for outreach (Hunter.IO email patterns).
Companies can have sovereign IDs without domains — domain is enrichment, not verification.

**Tiered free approach (SNAP_ON_TOOLBOX.yaml Tier 0):**

#### Tier 0A: DNS Inference + MX Validation (FREE, fastest)

Normalizes company names into domain candidates, validates via DNS A + MX lookups.

```bash
# Discover domains for all companies missing them
node pipeline/discover_domains.js

# Dry run (preview only, no DB writes)
node pipeline/discover_domains.js --dry-run

# Limit to 100 companies
node pipeline/discover_domains.js --limit 100

# Only DOL-sourced companies
node pipeline/discover_domains.js --source DOL

# Verbose (show all DNS attempts)
node pipeline/discover_domains.js --verbose
```

**How it works:**
1. Queries `cl.company_identity` for companies with `company_domain IS NULL`
2. Normalizes company name → generates candidate domains (`.com`, `.net`, `.org`, state variants, word-based short variants)
3. Validates each candidate via DNS A record + MX record lookup (Node.js built-in `dns` module)
4. Checks for parked domains (sedoparking, parkingcrew, etc.)
5. Writes validated domain to `cl.company_identity` and `cl.company_candidate.raw_payload`

**Expected hit rate:** ~74% (tested on 1,073 companies → 776 domains found)
**Speed:** ~100 companies in 13 seconds (10x concurrency)
**Cost:** $0 (DNS queries are free)

#### Tier 0B: Clay / External Enrichment

For companies DNS inference can't find, use Clay or other enrichment services.

```bash
# Ingest Clay CSV export with domain discoveries
node pipeline/ingest_clay_domains.js --file "path/to/clay_export.csv"

# Dry run
node pipeline/ingest_clay_domains.js --file "path/to/clay_export.csv" --dry-run

# Skip MX validation (trust Clay)
node pipeline/ingest_clay_domains.js --file "path/to/clay_export.csv" --skip-mx
```

**Safeguards:**
- Known-bad domain rejection (directories: bbb.org, mapquest.com, yelp.com; government: .gov; EIN lookup sites; etc.)
- Pattern-based rejection (.gov, chamber sites, county/city government)
- MX validation on every domain before DB write
- Skips companies that already have a domain

#### Full Domain Discovery Workflow

```bash
# Step 1: Free DNS inference (catches ~74%)
node pipeline/discover_domains.js

# Step 2: Clay enrichment for remaining (catches ~65% of remaining)
node pipeline/ingest_clay_domains.js --file "path/to/clay_export.csv"

# Step 3: Remaining companies (typically <1%) are genuinely hard cases
#   - Very small businesses, personal practices, holding companies
#   - May not have a discoverable domain
#   - Still have sovereign IDs — domain is enrichment, not verification
```

### Exclusion Keywords (Non-Commercial Entities to Skip)

Government, education, religious, financial cooperatives, and veterans facilities
are filtered out. See `EXCLUDED_KEYWORDS` in `filter_and_count.js` for the full list.

---

## Adding a New State

To add a new state (e.g., Texas):

1. Create adapter: `pipeline/adapters/source_tx_api.js`
2. Extend `SourceAdapter` with `state_code: 'TX'`
3. Implement `read()` and `getSourceRecordId()`
4. Register in `pipeline/index.js`
5. Use `IntakeService` to ingest
6. Run orchestrator — verification is automatic

**No changes to verification logic required.** State is DATA.

## Hard Constraints

- **Do NOT** special-case any state in lifecycle logic
- **Do NOT** put verification logic in adapters
- **Do NOT** mint identities without VERIFIED status
- **Do NOT** delete or re-mint existing identities
- **Fail closed** if state or source is missing

## Database Tables

### cl.company_candidate

Staging table for all candidates.

| Column | Type | Description |
|--------|------|-------------|
| candidate_id | UUID | Primary key |
| source_system | TEXT | Origin system (e.g., 'nc_sos_excel') |
| source_record_id | TEXT | Unique ID within source |
| state_code | CHAR(2) | US state code |
| raw_payload | JSONB | Complete raw data |
| verification_status | TEXT | PENDING / VERIFIED / FAILED |
| company_unique_id | UUID | FK to identity (after minting) |

### cl.company_identity

Sovereign identity table.

| Column | Type | Description |
|--------|------|-------------|
| company_unique_id | UUID | Primary key (minted identity) |
| company_name | TEXT | Verified company name |
| company_domain | TEXT | Verified domain |
| linkedin_company_url | TEXT | Verified LinkedIn URL |
| source_system | TEXT | Origin system |
| state_code | CHAR(2) | State from candidate |
