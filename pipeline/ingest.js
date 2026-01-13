#!/usr/bin/env node
/**
 * Ingestion CLI
 *
 * CANONICAL ENTRY POINT for ingesting source data into cl.company_candidate
 *
 * DOCTRINE-LOCK:
 * - All sources flow through this script
 * - Writes ONLY to cl.company_candidate
 * - Does NOT verify
 * - Does NOT mint identities
 * - State is DATA, embedded in every record
 * - COMPILE-TIME GUARDS enforce adapter invariants
 *
 * USAGE:
 *   node pipeline/ingest.js --source NC --file path/to/file.xlsx
 *   node pipeline/ingest.js --source DE --file path/to/file.csv
 *   node pipeline/ingest.js --source DE --file data.csv --dry-run
 *
 * After ingestion, run orchestrator.js to verify and mint:
 *   node pipeline/orchestrator.js --state NC
 *   node pipeline/orchestrator.js --state DE
 */

const { IntakeService } = require('./intake_service');
const { NCExcelSourceAdapter } = require('./adapters/source_nc_excel');
const { DECsvSourceAdapter } = require('./adapters/source_de_csv');
const { StateCsvSourceAdapter, getIdentityFieldAllowlist } = require('./adapters/state_csv_adapter');

// ══════════════════════════════════════════════════════════════════════════════
// COMPILE-TIME GUARDS (DOCTRINE-LOCK)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GUARD 1: Verify all adapters extend StateCsvSourceAdapter
 * This ensures all invariants are inherited.
 */
function assertAdapterInheritance(AdapterClass, name) {
  // Create test instance to verify inheritance
  // This will throw if invariants are violated
  try {
    const testInstance = new AdapterClass();

    // Verify it extends StateCsvSourceAdapter
    if (!(testInstance instanceof StateCsvSourceAdapter)) {
      throw new Error(
        `COMPILE-TIME GUARD FAILURE: ${name} must extend StateCsvSourceAdapter. ` +
        'All adapters must inherit lifecycle invariants.'
      );
    }

    // Verify state_code is set
    if (!testInstance.state_code || !/^[A-Z]{2}$/.test(testInstance.state_code)) {
      throw new Error(
        `COMPILE-TIME GUARD FAILURE: ${name} has invalid state_code. ` +
        'state_code MUST be 2 uppercase letters.'
      );
    }

    // Verify source_system is set
    if (!testInstance.source_system) {
      throw new Error(
        `COMPILE-TIME GUARD FAILURE: ${name} has no source_system. ` +
        'source_system MUST be explicitly declared.'
      );
    }

    console.log(`[GUARD] ✓ ${name} passed compile-time checks (${testInstance.state_code})`);
    return testInstance;
  } catch (error) {
    // Re-throw with guard context
    throw new Error(`COMPILE-TIME GUARD FAILURE for ${name}: ${error.message}`);
  }
}

/**
 * GUARD 2: Verify identity logic is ONLY in lifecycle_worker
 * This prevents identity extraction/minting outside the canonical path.
 */
function assertIdentityFieldAllowlist() {
  const allowlist = getIdentityFieldAllowlist();
  const expected = ['company_name', 'company_domain', 'linkedin_url'];

  for (const field of expected) {
    if (!allowlist.includes(field)) {
      throw new Error(
        `COMPILE-TIME GUARD FAILURE: Identity field "${field}" missing from allowlist. ` +
        'Identity fields are locked and cannot be modified.'
      );
    }
  }

  if (allowlist.length !== expected.length) {
    throw new Error(
      `COMPILE-TIME GUARD FAILURE: Identity field allowlist has unexpected entries. ` +
      `Expected: ${expected.join(', ')}. Got: ${allowlist.join(', ')}`
    );
  }

  console.log('[GUARD] ✓ Identity field allowlist is locked');
}

// ══════════════════════════════════════════════════════════════════════════════
// ADAPTER REGISTRY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Supported source adapters.
 * Each adapter is verified at module load time.
 *
 * To add a new state:
 * 1. Create adapter extending StateCsvSourceAdapter
 * 2. Add to this registry
 * 3. Compile-time guards will verify invariants
 */
const ADAPTERS = {};

// Register and verify adapters at module load time
// This ensures compile-time guard failures happen immediately
try {
  console.log('\n[DOCTRINE-LOCK] Running compile-time guards...\n');

  // Guard 2: Verify identity field allowlist
  assertIdentityFieldAllowlist();

  // Guard 1: Verify each adapter
  // Note: Each adapter constructor will also enforce uniqueness via StateCsvSourceAdapter
  const ncAdapter = assertAdapterInheritance(NCExcelSourceAdapter, 'NCExcelSourceAdapter');
  ADAPTERS['NC'] = NCExcelSourceAdapter;

  const deAdapter = assertAdapterInheritance(DECsvSourceAdapter, 'DECsvSourceAdapter');
  ADAPTERS['DE'] = DECsvSourceAdapter;

  // Future adapters go here:
  // const txAdapter = assertAdapterInheritance(TXCsvSourceAdapter, 'TXCsvSourceAdapter');
  // ADAPTERS['TX'] = TXCsvSourceAdapter;

  console.log('\n[DOCTRINE-LOCK] ✓ All compile-time guards passed\n');
  console.log('[DOCTRINE-LOCK] Registered adapters:', Object.keys(ADAPTERS).join(', '));
  console.log('');

} catch (error) {
  console.error('\n══════════════════════════════════════════════════════════════');
  console.error('DOCTRINE-LOCK BUILD FAILURE');
  console.error('══════════════════════════════════════════════════════════════');
  console.error(error.message);
  console.error('══════════════════════════════════════════════════════════════\n');
  process.exit(1);
}

// ══════════════════════════════════════════════════════════════════════════════
// CLI IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const config = {
    source: null,
    filePath: null,
    dryRun: args.includes('--dry-run'),
  };

  // Parse --source
  const sourceIdx = args.indexOf('--source');
  if (sourceIdx !== -1 && args[sourceIdx + 1]) {
    config.source = args[sourceIdx + 1].toUpperCase();
  }

  // Parse --file
  const fileIdx = args.indexOf('--file');
  if (fileIdx !== -1 && args[fileIdx + 1]) {
    config.filePath = args[fileIdx + 1];
  }

  // Validate
  if (!config.source) {
    console.error('ERROR: --source is required');
    console.error('Available sources:', Object.keys(ADAPTERS).join(', '));
    printUsage();
    process.exit(1);
  }

  if (!ADAPTERS[config.source]) {
    console.error(`ERROR: Unknown source "${config.source}"`);
    console.error('Available sources:', Object.keys(ADAPTERS).join(', '));
    process.exit(1);
  }

  if (!config.filePath) {
    console.error('ERROR: --file is required');
    printUsage();
    process.exit(1);
  }

  console.log('═'.repeat(60));
  console.log('COMPANY LIFECYCLE - INGESTION CLI');
  console.log('═'.repeat(60));
  console.log(`Source: ${config.source}`);
  console.log(`File: ${config.filePath}`);
  console.log(`Dry Run: ${config.dryRun}`);
  console.log('═'.repeat(60));

  // Create adapter and intake service
  const AdapterClass = ADAPTERS[config.source];
  const adapter = new AdapterClass();
  const intake = new IntakeService({ dryRun: config.dryRun });

  try {
    await intake.connect();

    const result = await intake.ingest(adapter, { filePath: config.filePath });

    console.log('\n' + '═'.repeat(60));
    console.log('INGESTION COMPLETE');
    console.log('═'.repeat(60));
    console.log(`Ingestion Run ID: ${result.ingestion_run_id}`);
    console.log(`Source System: ${result.source_system}`);
    console.log(`State Code: ${result.state_code}`);
    console.log(`Records Read: ${result.records_read}`);
    console.log(`Records Inserted: ${result.records_inserted}`);
    console.log(`Records Skipped: ${result.records_skipped}`);
    console.log(`Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\nFirst 10 errors:');
      result.errors.slice(0, 10).forEach((err, i) => {
        console.log(`  ${i + 1}. Record ${err.source_record_id}: ${err.error}`);
      });
    }

    console.log('═'.repeat(60));
    console.log('\nNEXT STEP: Run verification and minting:');
    console.log(`  node pipeline/orchestrator.js --state ${config.source}`);
    console.log('═'.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('\nERROR:', error.message);
    process.exit(1);
  } finally {
    await intake.disconnect();
  }
}

function printUsage() {
  const states = Object.keys(ADAPTERS).join(', ');
  console.log(`
USAGE:
  node pipeline/ingest.js --source <STATE> --file <PATH> [--dry-run]

OPTIONS:
  --source    State/source code (${states})
  --file      Path to source file (Excel, CSV, etc.)
  --dry-run   Don't write to database

EXAMPLES:
  node pipeline/ingest.js --source NC --file "Companies NC.xlsx"
  node pipeline/ingest.js --source DE --file "Delaware-Companies.csv"
  node pipeline/ingest.js --source DE --file data.csv --dry-run

AFTER INGESTION:
  Run the orchestrator to verify and mint identities:
  node pipeline/orchestrator.js --state NC
  node pipeline/orchestrator.js --state DE

DOCTRINE-LOCK:
  All adapters must extend StateCsvSourceAdapter.
  state_code is ALWAYS injected by adapter, never parsed from CSV.
  Identity fields are restricted to: company_name, company_domain, linkedin_url.
`);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { ADAPTERS };
