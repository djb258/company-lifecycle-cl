/**
 * Multi-State Orchestrator
 *
 * SOVEREIGN INTAKE ENGINE - ORCHESTRATION LAYER
 *
 * DOCTRINE:
 * - Discovers all states with pending candidates
 * - Processes each state in deterministic order
 * - State is DATA, not CODE
 * - No special-casing of any state
 *
 * EXECUTION ORDER:
 * 1. Query: SELECT DISTINCT state_code FROM cl.company_candidate WHERE verification_status = 'PENDING'
 * 2. For each state_code: runLifecyclePipeline({ state_code })
 * 3. Aggregate results
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const { LifecycleWorker } = require('./lifecycle_worker');

/**
 * @typedef {Object} OrchestratorConfig
 * @property {string} [connectionString] - Database connection string
 * @property {boolean} [dryRun] - If true, don't commit changes
 * @property {number} [batchSize] - Max records per state per batch
 * @property {string[]} [stateFilter] - Only process these states (if provided)
 */

/**
 * @typedef {Object} OrchestratorResult
 * @property {string} orchestration_id
 * @property {Date} started_at
 * @property {Date} completed_at
 * @property {number} states_processed
 * @property {Object} aggregate
 * @property {Object[]} state_results
 */

class MultiStateOrchestrator {
  /**
   * @param {OrchestratorConfig} config
   */
  constructor(config = {}) {
    this.connectionString =
      config.connectionString ||
      process.env.VITE_DATABASE_URL ||
      process.env.DATABASE_URL;

    this.dryRun = config.dryRun || false;
    this.batchSize = config.batchSize || 100;
    this.stateFilter = config.stateFilter || null;
    this.pool = null;
    this.worker = null;
  }

  /**
   * Initialize connections
   */
  async connect() {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: this.connectionString,
        ssl: { rejectUnauthorized: false },
      });
    }

    if (!this.worker) {
      this.worker = new LifecycleWorker({
        connectionString: this.connectionString,
        dryRun: this.dryRun,
      });
      await this.worker.connect();
    }

    return this.pool;
  }

  /**
   * Close connections
   */
  async disconnect() {
    if (this.worker) {
      await this.worker.disconnect();
      this.worker = null;
    }
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Discover states with pending candidates
   *
   * @returns {Promise<string[]>} - Array of state codes
   */
  async discoverPendingStates() {
    const pool = await this.connect();

    const query = `
      SELECT DISTINCT state_code
      FROM cl.company_candidate
      WHERE verification_status = 'PENDING'
      ORDER BY state_code ASC
    `;

    const result = await pool.query(query);
    const states = result.rows.map((row) => row.state_code);

    // Apply filter if provided
    if (this.stateFilter && this.stateFilter.length > 0) {
      return states.filter((s) => this.stateFilter.includes(s));
    }

    return states;
  }

  /**
   * Run orchestration for all pending states
   *
   * DOCTRINE: Process each state deterministically.
   * No parallelism - deterministic ordering is REQUIRED.
   *
   * @returns {Promise<OrchestratorResult>}
   */
  async run() {
    const orchestration_id = uuidv4();
    const started_at = new Date();

    console.log('═'.repeat(60));
    console.log('COMPANY LIFECYCLE - MULTI-STATE ORCHESTRATOR');
    console.log('═'.repeat(60));
    console.log(`Orchestration ID: ${orchestration_id}`);
    console.log(`Started At: ${started_at.toISOString()}`);
    console.log(`Dry Run: ${this.dryRun}`);
    console.log(`Batch Size: ${this.batchSize}`);
    console.log('═'.repeat(60));

    await this.connect();

    // Discover pending states
    const pendingStates = await this.discoverPendingStates();
    console.log(`\nDiscovered ${pendingStates.length} state(s) with pending candidates:`);
    console.log(pendingStates.length > 0 ? pendingStates.join(', ') : '(none)');

    const stateResults = [];
    const aggregate = {
      total_processed: 0,
      total_verified: 0,
      total_failed: 0,
      total_minted: 0,
    };

    // Process each state sequentially (deterministic order)
    for (const state_code of pendingStates) {
      console.log(`\n${'─'.repeat(40)}`);
      console.log(`Processing State: ${state_code}`);
      console.log('─'.repeat(40));

      try {
        const result = await this.worker.runLifecyclePipeline({
          state_code,
          batch_size: this.batchSize,
          run_id: `${orchestration_id}-${state_code}`,
        });

        stateResults.push(result);

        // Aggregate
        aggregate.total_processed += result.processed;
        aggregate.total_verified += result.verified;
        aggregate.total_failed += result.failed;
        aggregate.total_minted += result.minted;
      } catch (error) {
        console.error(`[Orchestrator] Error processing ${state_code}: ${error.message}`);
        stateResults.push({
          state_code,
          error: error.message,
          processed: 0,
          verified: 0,
          failed: 0,
          minted: 0,
        });
      }
    }

    const completed_at = new Date();

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('ORCHESTRATION COMPLETE');
    console.log('═'.repeat(60));
    console.log(`States Processed: ${pendingStates.length}`);
    console.log(`Total Candidates Processed: ${aggregate.total_processed}`);
    console.log(`Total Verified: ${aggregate.total_verified}`);
    console.log(`Total Failed: ${aggregate.total_failed}`);
    console.log(`Total Identities Minted: ${aggregate.total_minted}`);
    console.log(`Duration: ${completed_at - started_at}ms`);
    console.log('═'.repeat(60));

    return {
      orchestration_id,
      started_at,
      completed_at,
      states_processed: pendingStates.length,
      aggregate,
      state_results: stateResults,
    };
  }

  /**
   * Run orchestration for a single state
   *
   * Convenience method for targeted processing.
   *
   * @param {string} state_code - US state code
   * @returns {Promise<Object>}
   */
  async runState(state_code) {
    console.log(`[Orchestrator] Running single-state orchestration for ${state_code}`);

    await this.connect();

    return this.worker.runLifecyclePipeline({
      state_code,
      batch_size: this.batchSize,
    });
  }
}

/**
 * CLI Entry Point
 *
 * Usage:
 *   node orchestrator.js                    # Process all pending states
 *   node orchestrator.js --state NC         # Process only NC
 *   node orchestrator.js --dry-run          # Dry run (no commits)
 *   node orchestrator.js --batch-size 50    # Custom batch size
 */
async function main() {
  const args = process.argv.slice(2);

  const config = {
    dryRun: args.includes('--dry-run'),
    batchSize: 100,
    stateFilter: null,
  };

  // Parse --state argument
  const stateIdx = args.indexOf('--state');
  if (stateIdx !== -1 && args[stateIdx + 1]) {
    config.stateFilter = [args[stateIdx + 1].toUpperCase()];
  }

  // Parse --batch-size argument
  const batchIdx = args.indexOf('--batch-size');
  if (batchIdx !== -1 && args[batchIdx + 1]) {
    config.batchSize = parseInt(args[batchIdx + 1], 10);
  }

  const orchestrator = new MultiStateOrchestrator(config);

  try {
    const result = await orchestrator.run();
    console.log('\nResult:', JSON.stringify(result.aggregate, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Orchestration failed:', error.message);
    process.exit(1);
  } finally {
    await orchestrator.disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { MultiStateOrchestrator };
