#!/usr/bin/env node
/**
 * Mint Verified Companies
 *
 * SIMPLE, DETERMINISTIC SCRIPT
 *
 * LOCKED INVARIANT:
 * Verified companies do not receive sovereign IDs by assumption.
 * They receive them only by passing through the canonical pipeline.
 *
 * GOAL:
 * For every company that is already verified, ensure it receives a
 * sovereign company_unique_id by flowing through the canonical lifecycle pipeline.
 *
 * HARD RULES:
 * 1. Never insert directly into cl.company_identity
 * 2. All minting must go through LifecycleWorker.mintIdentity()
 * 3. All records must pass through cl.company_candidate
 * 4. Do not re-verify business logic — reuse existing verification
 * 5. Do not touch Outreach
 * 6. Fail closed if required data is missing
 *
 * WORKFLOW:
 * 1. Run this script to stage candidates
 * 2. Run orchestrator to mint: node pipeline/orchestrator.js --state MD
 *
 * USAGE:
 *   node pipeline/mint_verified_companies.js --states MD,VA,PA
 *   node pipeline/mint_verified_companies.js --all-states
 *   node pipeline/mint_verified_companies.js --dry-run
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Valid US state codes
const VALID_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]);

// All states with backfill candidates
const ALL_STATES = ['PA', 'OH', 'VA', 'MD', 'KY', 'OK', 'WV', 'DE'];

// Default connection string
const DEFAULT_CONNECTION =
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech:5432/Marketing%20DB?sslmode=require';

/**
 * Normalize domain from URL
 */
function normalizeDomain(url) {
  if (!url) return null;
  let d = String(url).trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '');
  d = d.replace(/^www\./, '');
  d = d.split('/')[0];
  return d.includes('.') ? d : null;
}

/**
 * Derive state code from row
 */
function deriveState(row) {
  const s = (row.address_state || row.state_abbrev || '').trim().toUpperCase();
  return VALID_STATES.has(s) ? s : null;
}

/**
 * Check admission gate (domain OR linkedin required)
 */
function passesAdmissionGate(row) {
  return !!(normalizeDomain(row.website_url) || row.linkedin_url);
}

/**
 * Main mint staging function
 */
async function mintVerifiedCompanies(config) {
  const { states, dryRun, limit } = config;
  const runId = `MINT-${uuidv4().slice(0, 8)}`;

  console.log('═'.repeat(60));
  console.log('MINT VERIFIED COMPANIES');
  console.log('═'.repeat(60));
  console.log(`Run ID: ${runId}`);
  console.log(`States: ${states.join(', ')}`);
  console.log(`Limit: ${limit}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log('═'.repeat(60));

  if (dryRun) {
    console.log('\n⚠️  DRY RUN — No database writes\n');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || DEFAULT_CONNECTION,
    ssl: { rejectUnauthorized: false },
  });

  const totals = {
    scanned: 0,
    staged_candidates: 0,
    skipped_missing_state: 0,
    skipped_missing_anchor: 0,
    already_staged: 0,
    ready_to_mint: 0,
  };

  try {
    for (const state of states) {
      if (!VALID_STATES.has(state)) {
        console.log(`[SKIP] Invalid state: ${state}`);
        continue;
      }

      console.log(`\n── Processing: ${state} ──`);

      // Step 1: Select eligible companies
      const selectQuery = `
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
          cm.industry,
          cm.employee_count,
          cm.validated_at,
          cm.validated_by,
          cm.data_quality_score,
          cm.email_pattern,
          cm.email_pattern_confidence,
          cm.ein,
          cm.source_system as legacy_source
        FROM company.company_master cm
        WHERE cm.validated_at IS NOT NULL
          AND COALESCE(cm.address_state, cm.state_abbrev) = $1
          AND NOT EXISTS (
            SELECT 1 FROM cl.company_identity ci
            WHERE LOWER(ci.company_domain) = LOWER(REGEXP_REPLACE(cm.website_url, '^https?://|www\\.|/$', '', 'g'))
          )
          AND NOT EXISTS (
            SELECT 1 FROM cl.company_candidate cc
            WHERE cc.source_system = 'LEGACY_VERIFIED_MINT'
              AND cc.source_record_id = cm.company_unique_id
          )
        ORDER BY cm.validated_at DESC
        LIMIT $2
      `;

      const result = await pool.query(selectQuery, [state, limit]);
      const rows = result.rows;

      console.log(`  Scanned: ${rows.length}`);
      totals.scanned += rows.length;

      let staged = 0;
      let skipState = 0;
      let skipAnchor = 0;

      for (const row of rows) {
        // Validate state
        const stateCode = deriveState(row);
        if (!stateCode) {
          skipState++;
          continue;
        }

        // Admission gate
        if (!passesAdmissionGate(row)) {
          skipAnchor++;
          continue;
        }

        // Build raw_payload
        const rawPayload = {
          company_name: row.company_name,
          company_domain: normalizeDomain(row.website_url),
          linkedin_url: row.linkedin_url,
          legacy_id: row.legacy_id,
          legacy_source: row.legacy_source,
          legacy_validated_at: row.validated_at,
          legacy_validated_by: row.validated_by,
          address_city: row.address_city,
          address_street: row.address_street,
          address_zip: row.address_zip,
          industry: row.industry,
          employee_count: row.employee_count,
          email_pattern: row.email_pattern,
          ein: row.ein,
        };

        if (!dryRun) {
          // Step 2: Stage into cl.company_candidate
          const insertQuery = `
            INSERT INTO cl.company_candidate (
              source_system,
              source_record_id,
              state_code,
              raw_payload,
              ingestion_run_id,
              verification_status,
              verified_at
            )
            VALUES ($1, $2, $3, $4, $5, 'VERIFIED_LEGACY', $6)
            ON CONFLICT (source_system, source_record_id) DO NOTHING
            RETURNING candidate_id
          `;

          const inserted = await pool.query(insertQuery, [
            'LEGACY_VERIFIED_MINT',
            row.legacy_id,
            stateCode,
            JSON.stringify(rawPayload),
            runId,
            row.validated_at,
          ]);

          if (inserted.rows.length > 0) {
            staged++;
          } else {
            totals.already_staged++;
          }
        } else {
          staged++;
        }
      }

      totals.staged_candidates += staged;
      totals.skipped_missing_state += skipState;
      totals.skipped_missing_anchor += skipAnchor;

      console.log(`  Staged: ${staged}`);
      if (skipState > 0) console.log(`  Skipped (no state): ${skipState}`);
      if (skipAnchor > 0) console.log(`  Skipped (no anchor): ${skipAnchor}`);
    }

    // Count ready to mint
    if (!dryRun) {
      const readyQuery = `
        SELECT COUNT(*) as count
        FROM cl.company_candidate
        WHERE verification_status = 'VERIFIED_LEGACY'
          AND company_unique_id IS NULL
      `;
      const readyResult = await pool.query(readyQuery);
      totals.ready_to_mint = parseInt(readyResult.rows[0].count, 10);
    } else {
      totals.ready_to_mint = totals.staged_candidates;
    }

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));
    console.log(`scanned:              ${totals.scanned}`);
    console.log(`staged_candidates:    ${totals.staged_candidates}`);
    console.log(`skipped_missing_state: ${totals.skipped_missing_state}`);
    console.log(`skipped_missing_anchor: ${totals.skipped_missing_anchor}`);
    console.log(`already_staged:       ${totals.already_staged}`);
    console.log(`ready_to_mint:        ${totals.ready_to_mint}`);
    console.log('═'.repeat(60));

    // Step 3: Print next step
    if (totals.ready_to_mint > 0 && !dryRun) {
      console.log('\n📋 NEXT STEP:');
      states.forEach((s) => {
        console.log(`  node pipeline/orchestrator.js --state ${s}`);
      });
      console.log('');
    }

    if (dryRun) {
      console.log('\n✅ Dry run complete. Remove --dry-run to execute.\n');
    }

  } finally {
    await pool.end();
  }

  return totals;
}

/**
 * CLI
 */
async function main() {
  const args = process.argv.slice(2);

  const config = {
    states: [],
    dryRun: args.includes('--dry-run'),
    limit: 10000,
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
    config.states = ALL_STATES;
  }

  // Parse --limit
  const limitIdx = args.indexOf('--limit');
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    config.limit = parseInt(args[limitIdx + 1], 10);
  }

  if (config.states.length === 0) {
    console.log(`
USAGE:
  node pipeline/mint_verified_companies.js --states MD,VA,PA [--dry-run]
  node pipeline/mint_verified_companies.js --all-states [--dry-run]
  node pipeline/mint_verified_companies.js --states MD --limit 100 --dry-run

AFTER STAGING:
  node pipeline/orchestrator.js --state MD
`);
    process.exit(1);
  }

  try {
    await mintVerifiedCompanies(config);
    process.exit(0);
  } catch (err) {
    console.error('\nERROR:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { mintVerifiedCompanies };
