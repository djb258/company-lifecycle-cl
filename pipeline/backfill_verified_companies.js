#!/usr/bin/env node
/**
 * Backfill Verified Companies
 *
 * ONE-TIME MIGRATION SCRIPT
 *
 * PURPOSE:
 * Honor previously verified companies by staging them into the canonical
 * pipeline so they can be minted with sovereign UUIDs.
 *
 * DOCTRINE:
 * - DO NOT mint directly - staging only
 * - DO NOT bypass verifyCandidate() or assertVerificationComplete()
 * - State must be derived deterministically or fail closed
 * - Admission gate: domain OR linkedin required
 *
 * WORKFLOW:
 * 1. Run this script: node pipeline/backfill_verified_companies.js --states MD,VA --dry-run
 * 2. Review output
 * 3. Run without --dry-run to stage candidates
 * 4. Run orchestrator: node pipeline/orchestrator.js --state MD
 *
 * SOURCE: company.company_master (validated_at IS NOT NULL)
 * TARGET: cl.company_candidate (verification_status = 'PENDING')
 *
 * USAGE:
 *   node pipeline/backfill_verified_companies.js --states MD,VA,WV,PA
 *   node pipeline/backfill_verified_companies.js --states MD --limit 100 --dry-run
 *   node pipeline/backfill_verified_companies.js --all-states
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Valid US state codes
const VALID_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]);

/**
 * @typedef {Object} BackfillConfig
 * @property {string[]} states - State codes to process
 * @property {number} limit - Max records per state
 * @property {boolean} dryRun - If true, don't write to database
 * @property {string} [connectionString] - Database connection string
 */

/**
 * @typedef {Object} BackfillResult
 * @property {string} backfill_run_id
 * @property {Date} started_at
 * @property {Date} completed_at
 * @property {Object} summary
 * @property {Object[]} state_results
 */

// Default connection string for CLI usage
// In production, use environment variables via Doppler
const DEFAULT_CONNECTION_STRING =
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech:5432/Marketing%20DB?sslmode=require';

class LegacyBackfillService {
  constructor(config) {
    this.connectionString =
      config.connectionString ||
      process.env.VITE_DATABASE_URL ||
      process.env.DATABASE_URL ||
      DEFAULT_CONNECTION_STRING;

    this.states = config.states || [];
    this.limit = config.limit || 10000;
    this.dryRun = config.dryRun || false;
    this.pool = null;
  }

  async connect() {
    if (!this.pool) {
      // Parse connection string to check for SSL requirement
      const useSSL = this.connectionString.includes('sslmode=require') ||
                     this.connectionString.includes('.neon.tech');

      this.pool = new Pool({
        connectionString: this.connectionString,
        ssl: useSSL ? { rejectUnauthorized: false } : false,
      });
    }
    return this.pool;
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Normalize domain from URL
   * @param {string} url
   * @returns {string|null}
   */
  normalizeDomain(url) {
    if (!url) return null;

    let domain = String(url).trim().toLowerCase();

    // Remove protocol
    domain = domain.replace(/^https?:\/\//, '');

    // Remove www.
    domain = domain.replace(/^www\./, '');

    // Remove trailing slash and path
    domain = domain.split('/')[0];

    // Validate has a dot
    if (!domain.includes('.')) return null;

    return domain;
  }

  /**
   * Derive state code deterministically
   * @param {Object} row - Legacy row
   * @returns {string|null}
   */
  deriveStateCode(row) {
    // Try address_state first
    let state = row.address_state;
    if (state && typeof state === 'string') {
      state = state.trim().toUpperCase();
      if (VALID_STATE_CODES.has(state)) {
        return state;
      }
    }

    // Try state_abbrev
    state = row.state_abbrev;
    if (state && typeof state === 'string') {
      state = state.trim().toUpperCase();
      if (VALID_STATE_CODES.has(state)) {
        return state;
      }
    }

    // Cannot derive - fail closed
    return null;
  }

  /**
   * Check admission gate
   * @param {Object} row
   * @returns {boolean}
   */
  passesAdmissionGate(row) {
    const domain = this.normalizeDomain(row.website_url);
    const linkedin = row.linkedin_url;

    return !!(domain || linkedin);
  }

  /**
   * Query legacy companies for backfill
   * @param {string} stateCode
   * @returns {Promise<Object[]>}
   */
  async queryLegacyCompanies(stateCode) {
    const pool = await this.connect();

    // Query validated companies not already in cl.company_identity
    const query = `
      SELECT
        cm.company_unique_id as legacy_id,
        cm.company_name,
        cm.website_url,
        cm.linkedin_url,
        cm.address_state,
        cm.state_abbrev,
        cm.address_city,
        cm.address_street,
        cm.address_zip,
        cm.address_country,
        cm.industry,
        cm.employee_count,
        cm.company_phone,
        cm.source_system as legacy_source,
        cm.source_record_id as legacy_source_record_id,
        cm.validated_at,
        cm.validated_by,
        cm.data_quality_score,
        cm.email_pattern,
        cm.email_pattern_confidence,
        cm.ein,
        cm.created_at as legacy_created_at
      FROM company.company_master cm
      WHERE cm.validated_at IS NOT NULL
        AND COALESCE(cm.address_state, cm.state_abbrev) = $1
        AND NOT EXISTS (
          SELECT 1 FROM cl.company_identity ci
          WHERE LOWER(ci.company_domain) = LOWER(REGEXP_REPLACE(cm.website_url, '^https?://|www\\.|/$', '', 'g'))
        )
        AND NOT EXISTS (
          SELECT 1 FROM cl.company_candidate cc
          WHERE cc.source_system = 'LEGACY_VERIFIED_BACKFILL'
            AND cc.source_record_id = cm.company_unique_id
        )
      ORDER BY cm.validated_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [stateCode, this.limit]);
    return result.rows;
  }

  /**
   * Insert candidate into cl.company_candidate
   * @param {Object} candidate
   * @param {string} backfillRunId
   * @returns {Promise<boolean>}
   */
  async insertCandidate(candidate, backfillRunId) {
    if (this.dryRun) {
      return true;
    }

    const pool = await this.connect();

    const query = `
      INSERT INTO cl.company_candidate (
        source_system,
        source_record_id,
        state_code,
        raw_payload,
        ingestion_run_id,
        verification_status
      )
      VALUES ($1, $2, $3, $4, $5, 'PENDING')
      ON CONFLICT (source_system, source_record_id) DO NOTHING
      RETURNING candidate_id
    `;

    try {
      const result = await pool.query(query, [
        'LEGACY_VERIFIED_BACKFILL',
        candidate.legacy_id,
        candidate.state_code,
        JSON.stringify(candidate.raw_payload),
        backfillRunId,
      ]);

      return result.rows.length > 0;
    } catch (error) {
      console.error(`[Backfill] Insert failed for ${candidate.legacy_id}: ${error.message}`);
      return false;
    }
  }

  /**
   * Run backfill for a single state
   * @param {string} stateCode
   * @param {string} backfillRunId
   * @returns {Promise<Object>}
   */
  async backfillState(stateCode, backfillRunId) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Processing State: ${stateCode}`);
    console.log('─'.repeat(50));

    const result = {
      state_code: stateCode,
      queried: 0,
      staged: 0,
      skipped_no_state: 0,
      skipped_admission: 0,
      skipped_duplicate: 0,
      errors: [],
    };

    // Query legacy companies
    const legacyRows = await this.queryLegacyCompanies(stateCode);
    result.queried = legacyRows.length;
    console.log(`[Backfill] Found ${legacyRows.length} legacy companies for ${stateCode}`);

    for (const row of legacyRows) {
      try {
        // Derive state code
        const derivedState = this.deriveStateCode(row);
        if (!derivedState) {
          result.skipped_no_state++;
          result.errors.push({
            legacy_id: row.legacy_id,
            error: 'STATE_DERIVATION_FAILED',
          });
          continue;
        }

        // Check admission gate
        if (!this.passesAdmissionGate(row)) {
          result.skipped_admission++;
          result.errors.push({
            legacy_id: row.legacy_id,
            error: 'ADMISSION_GATE_FAILED',
          });
          continue;
        }

        // Build candidate record
        const candidate = {
          legacy_id: row.legacy_id,
          state_code: derivedState,
          raw_payload: {
            // Standard fields for verifyCandidate()
            company_name: row.company_name,
            company_domain: this.normalizeDomain(row.website_url),
            linkedin_url: row.linkedin_url,

            // Legacy provenance
            legacy_source: row.legacy_source,
            legacy_source_record_id: row.legacy_source_record_id,
            legacy_validated_at: row.validated_at,
            legacy_validated_by: row.validated_by,
            legacy_data_quality_score: row.data_quality_score,

            // Additional legacy data
            address_city: row.address_city,
            address_street: row.address_street,
            address_zip: row.address_zip,
            address_country: row.address_country,
            industry: row.industry,
            employee_count: row.employee_count,
            company_phone: row.company_phone,
            email_pattern: row.email_pattern,
            email_pattern_confidence: row.email_pattern_confidence,
            ein: row.ein,
          },
        };

        // Insert into cl.company_candidate
        const inserted = await this.insertCandidate(candidate, backfillRunId);
        if (inserted) {
          result.staged++;
          if (result.staged % 100 === 0) {
            console.log(`[Backfill] Progress: ${result.staged} staged for ${stateCode}`);
          }
        } else {
          result.skipped_duplicate++;
        }
      } catch (error) {
        result.errors.push({
          legacy_id: row.legacy_id,
          error: error.message,
        });
      }
    }

    console.log(`[Backfill] ${stateCode} complete: ${result.staged} staged, ${result.skipped_admission} skipped (admission), ${result.skipped_duplicate} skipped (duplicate)`);

    return result;
  }

  /**
   * Run full backfill
   * @returns {Promise<BackfillResult>}
   */
  async run() {
    const backfillRunId = `BACKFILL-${uuidv4()}`;
    const startedAt = new Date();

    console.log('═'.repeat(60));
    console.log('LEGACY VERIFIED COMPANIES BACKFILL');
    console.log('═'.repeat(60));
    console.log(`Backfill Run ID: ${backfillRunId}`);
    console.log(`Started At: ${startedAt.toISOString()}`);
    console.log(`States: ${this.states.join(', ')}`);
    console.log(`Limit per State: ${this.limit}`);
    console.log(`Dry Run: ${this.dryRun}`);
    console.log('═'.repeat(60));

    if (this.dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No database writes will occur\n');
    }

    await this.connect();

    const stateResults = [];
    const summary = {
      total_queried: 0,
      total_staged: 0,
      total_skipped_no_state: 0,
      total_skipped_admission: 0,
      total_skipped_duplicate: 0,
    };

    for (const stateCode of this.states) {
      // Validate state code
      if (!VALID_STATE_CODES.has(stateCode)) {
        console.log(`[Backfill] Invalid state code: ${stateCode} - SKIPPING`);
        continue;
      }

      const result = await this.backfillState(stateCode, backfillRunId);
      stateResults.push(result);

      // Aggregate
      summary.total_queried += result.queried;
      summary.total_staged += result.staged;
      summary.total_skipped_no_state += result.skipped_no_state;
      summary.total_skipped_admission += result.skipped_admission;
      summary.total_skipped_duplicate += result.skipped_duplicate;
    }

    const completedAt = new Date();

    console.log('\n' + '═'.repeat(60));
    console.log('BACKFILL COMPLETE');
    console.log('═'.repeat(60));
    console.log(`Total Queried: ${summary.total_queried}`);
    console.log(`Total Staged: ${summary.total_staged}`);
    console.log(`Skipped (No State): ${summary.total_skipped_no_state}`);
    console.log(`Skipped (Admission): ${summary.total_skipped_admission}`);
    console.log(`Skipped (Duplicate): ${summary.total_skipped_duplicate}`);
    console.log(`Duration: ${completedAt - startedAt}ms`);
    console.log('═'.repeat(60));

    if (!this.dryRun && summary.total_staged > 0) {
      console.log('\n📋 NEXT STEPS:');
      console.log('Run the orchestrator to verify and mint identities:');
      this.states.forEach((state) => {
        console.log(`  node pipeline/orchestrator.js --state ${state}`);
      });
      console.log('');
    }

    return {
      backfill_run_id: backfillRunId,
      started_at: startedAt,
      completed_at: completedAt,
      summary,
      state_results: stateResults,
    };
  }
}

/**
 * CLI Entry Point
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const config = {
    states: [],
    limit: 10000,
    dryRun: args.includes('--dry-run'),
  };

  // Parse --states
  const statesIdx = args.indexOf('--states');
  if (statesIdx !== -1 && args[statesIdx + 1]) {
    config.states = args[statesIdx + 1]
      .toUpperCase()
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length === 2);
  }

  // Parse --all-states
  if (args.includes('--all-states')) {
    config.states = ['PA', 'OH', 'VA', 'MD', 'KY', 'OK', 'WV', 'DE'];
  }

  // Parse --limit
  const limitIdx = args.indexOf('--limit');
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    config.limit = parseInt(args[limitIdx + 1], 10);
  }

  // Validate
  if (config.states.length === 0) {
    console.error('ERROR: --states is required');
    printUsage();
    process.exit(1);
  }

  const service = new LegacyBackfillService(config);

  try {
    const result = await service.run();

    if (config.dryRun) {
      console.log('\n✅ Dry run complete. Review the output above.');
      console.log('To execute, remove --dry-run flag.\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\nERROR:', error.message);
    process.exit(1);
  } finally {
    await service.disconnect();
  }
}

function printUsage() {
  console.log(`
USAGE:
  node pipeline/backfill_verified_companies.js --states <STATES> [--limit N] [--dry-run]

OPTIONS:
  --states      Comma-separated state codes (e.g., MD,VA,WV,PA)
  --all-states  Process all states with backfill candidates
  --limit       Max records per state (default: 10000)
  --dry-run     Preview without writing to database

EXAMPLES:
  node pipeline/backfill_verified_companies.js --states MD --dry-run
  node pipeline/backfill_verified_companies.js --states MD,VA,WV --limit 500
  node pipeline/backfill_verified_companies.js --all-states

AFTER BACKFILL:
  Run the orchestrator to verify and mint:
  node pipeline/orchestrator.js --state MD
  node pipeline/orchestrator.js --state VA
`);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { LegacyBackfillService };
