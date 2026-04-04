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

All candidates must pass these rules:

1. **Admission Gate**: `company_domain IS NOT NULL OR linkedin_url IS NOT NULL`
2. **Company Name**: Must be non-empty
3. **Domain Format**: Must be valid domain format (if provided)
4. **LinkedIn Format**: Must be valid LinkedIn company URL (if provided)
5. **No Generic Domains**: gmail.com, yahoo.com, etc. rejected

## Adding a New State

To add a new state (e.g., Texas):

1. Create adapter: `pipeline/adapters/source_tx_api.js`
2. Extend `SourceAdapter` with `state_code: 'TX'`
3. Implement `read()` and `getSourceRecordId()`
4. Register in `pipeline/index.js`
5. Use `IntakeService` to ingest

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
