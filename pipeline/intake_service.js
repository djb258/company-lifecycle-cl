/**
 * Intake Service
 *
 * SOVEREIGN INTAKE ENGINE - INGESTION LAYER
 *
 * DOCTRINE:
 * - Source adapters produce CandidateRecords
 * - Intake service writes to cl.company_candidate
 * - State is DATA embedded in every record
 * - No verification here - verification happens downstream
 *
 * HARD CONSTRAINTS:
 * - Do NOT skip source_system or state_code
 * - Do NOT perform verification logic
 * - Do NOT mint identities
 * - Fail closed on missing required fields
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

/**
 * @typedef {Object} IntakeConfig
 * @property {string} [connectionString] - Database connection string
 * @property {boolean} [dryRun] - If true, don't commit to database
 */

/**
 * @typedef {Object} IntakeResult
 * @property {string} ingestion_run_id
 * @property {string} source_system
 * @property {string} state_code
 * @property {number} records_read
 * @property {number} records_inserted
 * @property {number} records_skipped
 * @property {Object[]} errors
 */

class IntakeService {
  /**
   * @param {IntakeConfig} config
   */
  constructor(config = {}) {
    this.connectionString =
      config.connectionString ||
      process.env.VITE_DATABASE_URL ||
      process.env.DATABASE_URL;

    this.dryRun = config.dryRun || false;
    this.pool = null;
  }

  /**
   * Initialize database connection
   */
  async connect() {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: this.connectionString,
        ssl: { rejectUnauthorized: false },
      });
    }
    return this.pool;
  }

  /**
   * Close database connection
   */
  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Ingest records from a source adapter
   *
   * DOCTRINE: This is a pass-through ingestion.
   * No verification, no transformation beyond adapter output.
   *
   * @param {Object} adapter - Source adapter instance
   * @param {Object} options - Adapter-specific options (e.g., filePath)
   * @returns {Promise<IntakeResult>}
   */
  async ingest(adapter, options) {
    const ingestion_run_id = uuidv4();
    const source_system = adapter.source_system;
    const state_code = adapter.state_code;

    console.log('[Intake] Starting ingestion');
    console.log(`[Intake] Run ID: ${ingestion_run_id}`);
    console.log(`[Intake] Source System: ${source_system}`);
    console.log(`[Intake] State Code: ${state_code}`);
    console.log(`[Intake] Dry Run: ${this.dryRun}`);

    const result = {
      ingestion_run_id,
      source_system,
      state_code,
      records_read: 0,
      records_inserted: 0,
      records_skipped: 0,
      errors: [],
    };

    const pool = await this.connect();

    try {
      // Read records from adapter
      for await (const candidate of adapter.read(options)) {
        result.records_read++;

        try {
          // Validate required fields
          this.validateCandidateRecord(candidate);

          // Insert into company_candidate
          const inserted = await this.insertCandidate(candidate, ingestion_run_id);

          if (inserted) {
            result.records_inserted++;
          } else {
            result.records_skipped++;
          }
        } catch (error) {
          result.errors.push({
            record_num: result.records_read,
            source_record_id: candidate.source_record_id,
            error: error.message,
          });
          result.records_skipped++;
        }

        // Progress logging every 100 records
        if (result.records_read % 100 === 0) {
          console.log(`[Intake] Progress: ${result.records_read} read, ${result.records_inserted} inserted`);
        }
      }

      console.log('[Intake] Ingestion complete');
      console.log(`[Intake] Records Read: ${result.records_read}`);
      console.log(`[Intake] Records Inserted: ${result.records_inserted}`);
      console.log(`[Intake] Records Skipped: ${result.records_skipped}`);
      console.log(`[Intake] Errors: ${result.errors.length}`);

      return result;
    } finally {
      // Let caller manage connection lifecycle
    }
  }

  /**
   * Validate candidate record has required fields
   *
   * @param {Object} candidate
   * @throws {Error} If required field is missing
   */
  validateCandidateRecord(candidate) {
    if (!candidate.source_system) {
      throw new Error('source_system is required');
    }
    if (!candidate.source_record_id) {
      throw new Error('source_record_id is required');
    }
    if (!candidate.state_code || !/^[A-Z]{2}$/.test(candidate.state_code)) {
      throw new Error('Valid state_code (2 uppercase letters) is required');
    }
    if (!candidate.raw_payload) {
      throw new Error('raw_payload is required');
    }
  }

  /**
   * Insert candidate into cl.company_candidate
   *
   * @param {Object} candidate - CandidateRecord from adapter
   * @param {string} ingestion_run_id - Run identifier
   * @returns {Promise<boolean>} - True if inserted, false if skipped (duplicate)
   */
  async insertCandidate(candidate, ingestion_run_id) {
    if (this.dryRun) {
      console.log(`[Intake] [DRY RUN] Would insert: ${candidate.source_record_id}`);
      return true;
    }

    const pool = await this.connect();

    // Build raw_payload with extracted fields
    const raw_payload = {
      ...candidate.raw_payload,
      company_name: candidate.company_name || null,
      company_domain: candidate.company_domain || null,
      linkedin_url: candidate.linkedin_url || null,
    };

    const query = `
      INSERT INTO cl.company_candidate (
        source_system,
        source_record_id,
        state_code,
        raw_payload,
        ingestion_run_id
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (source_system, source_record_id) DO NOTHING
      RETURNING candidate_id
    `;

    try {
      const result = await pool.query(query, [
        candidate.source_system,
        candidate.source_record_id,
        candidate.state_code,
        JSON.stringify(raw_payload),
        ingestion_run_id,
      ]);

      return result.rows.length > 0;
    } catch (error) {
      // Re-throw with context
      throw new Error(`Insert failed for ${candidate.source_record_id}: ${error.message}`);
    }
  }
}

module.exports = { IntakeService };
