/**
 * Company Lifecycle Pipeline
 *
 * SOVEREIGN INTAKE ENGINE
 *
 * DOCTRINE:
 * - NC is Source Stream #001, not special
 * - State is DATA, not CODE
 * - All states use the same verification logic
 * - Identity minting ONLY after VERIFIED status
 *
 * INVARIANT (LOCKED):
 * If any code path mints an identity without passing through
 * cl.company_candidate → verifyCandidate(), the build is invalid.
 *
 * ENTRY POINTS (CLI):
 * - ingest.js: Ingest source data into cl.company_candidate
 * - orchestrator.js: Verify and mint identities
 *
 * USAGE:
 *
 * # Step 1: Ingest source data
 * node pipeline/ingest.js --source NC --file data.xlsx
 *
 * # Step 2: Verify and mint identities
 * node pipeline/orchestrator.js --state NC
 *
 * # Or programmatically:
 * const { NCExcelSourceAdapter, IntakeService } = require('./pipeline');
 * const adapter = new NCExcelSourceAdapter();
 * const intake = new IntakeService();
 * await intake.ingest(adapter, { filePath: 'data.xlsx' });
 *
 * const { MultiStateOrchestrator } = require('./pipeline');
 * const orchestrator = new MultiStateOrchestrator();
 * await orchestrator.run();
 */

// Source Adapters
const { SourceAdapter } = require('./adapters/source_adapter');
const { NCExcelSourceAdapter, NC_COLUMN_MAP } = require('./adapters/source_nc_excel');

// Services
const { IntakeService } = require('./intake_service');
const { LifecycleWorker, assertVerificationComplete } = require('./lifecycle_worker');
const { MultiStateOrchestrator } = require('./orchestrator');

// CLI entry point adapters
const { ADAPTERS } = require('./ingest');

// Backfill service
const { LegacyBackfillService } = require('./backfill_verified_companies');

module.exports = {
  // Base classes
  SourceAdapter,

  // NC Source Adapter (Source Stream #001)
  NCExcelSourceAdapter,
  NC_COLUMN_MAP,

  // Services
  IntakeService,
  LifecycleWorker,
  MultiStateOrchestrator,

  // Invariant enforcement
  assertVerificationComplete,

  // Available source adapters
  ADAPTERS,

  // Backfill service (one-time migration)
  LegacyBackfillService,
};
