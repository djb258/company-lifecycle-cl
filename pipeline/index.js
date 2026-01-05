/**
 * Company Lifecycle Pipeline
 *
 * SOVEREIGN INTAKE ENGINE
 *
 * DOCTRINE:
 * - NC is Source Stream #001, not special
 * - State is DATA, not CODE
 * - All states use the same verification logic
 * - Identity minting only after VERIFIED status
 *
 * COMPONENTS:
 * - SourceAdapter: Base class for source adapters
 * - NCExcelSourceAdapter: NC Secretary of State Excel adapter
 * - IntakeService: Ingests candidates from adapters
 * - LifecycleWorker: Verifies and mints identities
 * - MultiStateOrchestrator: Orchestrates multi-state processing
 *
 * USAGE:
 *
 * // Ingest NC Excel file
 * const { NCExcelSourceAdapter, IntakeService } = require('./pipeline');
 * const adapter = new NCExcelSourceAdapter();
 * const intake = new IntakeService();
 * await intake.ingest(adapter, { filePath: 'nc_data.xlsx' });
 *
 * // Process all pending candidates
 * const { MultiStateOrchestrator } = require('./pipeline');
 * const orchestrator = new MultiStateOrchestrator();
 * await orchestrator.run();
 *
 * // Process single state
 * const { LifecycleWorker } = require('./pipeline');
 * const worker = new LifecycleWorker();
 * await worker.runLifecyclePipeline({ state_code: 'NC' });
 */

// Source Adapters
const { SourceAdapter } = require('./adapters/source_adapter');
const { NCExcelSourceAdapter, NC_COLUMN_MAP } = require('./adapters/source_nc_excel');

// Services
const { IntakeService } = require('./intake_service');
const { LifecycleWorker } = require('./lifecycle_worker');
const { MultiStateOrchestrator } = require('./orchestrator');

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
};
