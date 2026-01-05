#!/usr/bin/env node
/**
 * Ingestion CLI
 *
 * CANONICAL ENTRY POINT for ingesting source data into cl.company_candidate
 *
 * DOCTRINE:
 * - All sources flow through this script
 * - Writes ONLY to cl.company_candidate
 * - Does NOT verify
 * - Does NOT mint identities
 * - State is DATA, embedded in every record
 *
 * USAGE:
 *   node pipeline/ingest.js --source NC --file path/to/file.xlsx
 *   node pipeline/ingest.js --source NC --file data.xlsx --dry-run
 *
 * After ingestion, run orchestrator.js to verify and mint:
 *   node pipeline/orchestrator.js --state NC
 */

const { IntakeService } = require('./intake_service');
const { NCExcelSourceAdapter } = require('./adapters/source_nc_excel');

// Supported source adapters
const ADAPTERS = {
  NC: NCExcelSourceAdapter,
  // Future: TX: TXApiSourceAdapter,
  // Future: FL: FLCsvSourceAdapter,
};

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
  console.log(`
USAGE:
  node pipeline/ingest.js --source <STATE> --file <PATH> [--dry-run]

OPTIONS:
  --source    State/source code (NC, TX, FL, etc.)
  --file      Path to source file (Excel, CSV, etc.)
  --dry-run   Don't write to database

EXAMPLES:
  node pipeline/ingest.js --source NC --file "Companies NC.xlsx"
  node pipeline/ingest.js --source NC --file data.xlsx --dry-run

AFTER INGESTION:
  Run the orchestrator to verify and mint identities:
  node pipeline/orchestrator.js --state NC
`);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { ADAPTERS };
