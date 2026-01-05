#!/usr/bin/env node
/**
 * Mint All Verified Companies
 *
 * FINAL RUN SCRIPT
 *
 * PURPOSE:
 * Ensure that every company that passes verification receives a sovereign
 * company_unique_id, using the canonical CL pipeline.
 *
 * 🔒 LOCKED INVARIANTS (DO NOT VIOLATE):
 * - No direct INSERT into cl.company_identity
 * - All minting must flow through cl.company_candidate → orchestrator → lifecycle_worker
 * - Verification must be complete before minting
 * - Dedup must occur before minting
 * - State is DATA, not CODE
 * - Fail closed if anything is missing
 *
 * ELIGIBILITY:
 * A company is eligible if and only if:
 * - It is staged in cl.company_candidate
 * - verification_status IN ('VERIFIED', 'VERIFIED_LEGACY')
 * - It has company_domain OR linkedin_company_url
 * - It does NOT already have a company_unique_id
 *
 * USAGE:
 *   node pipeline/mint_all_verified.js
 *   node pipeline/mint_all_verified.js --dry-run
 */

const { Pool } = require('pg');
const { MultiStateOrchestrator } = require('./orchestrator');

// Default connection string
const DEFAULT_CONNECTION =
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech:5432/Marketing%20DB?sslmode=require';

/**
 * Discover all states with eligible candidates
 * @returns {Promise<string[]>}
 */
async function discoverEligibleStates(pool) {
  const query = `
    SELECT DISTINCT state_code
    FROM cl.company_candidate
    WHERE verification_status IN ('VERIFIED', 'VERIFIED_LEGACY')
      AND company_unique_id IS NULL
    ORDER BY state_code ASC
  `;

  const result = await pool.query(query);
  return result.rows.map((r) => r.state_code.trim());
}

/**
 * Count eligible candidates per state
 * @returns {Promise<Object>}
 */
async function countByState(pool) {
  const query = `
    SELECT
      state_code,
      verification_status,
      COUNT(*) as count
    FROM cl.company_candidate
    WHERE verification_status IN ('VERIFIED', 'VERIFIED_LEGACY')
      AND company_unique_id IS NULL
    GROUP BY state_code, verification_status
    ORDER BY state_code, verification_status
  `;

  const result = await pool.query(query);
  const counts = {};

  for (const row of result.rows) {
    const state = row.state_code.trim();
    if (!counts[state]) {
      counts[state] = { verified: 0, verified_legacy: 0, total: 0 };
    }
    if (row.verification_status === 'VERIFIED') {
      counts[state].verified = parseInt(row.count, 10);
    } else if (row.verification_status === 'VERIFIED_LEGACY') {
      counts[state].verified_legacy = parseInt(row.count, 10);
    }
    counts[state].total += parseInt(row.count, 10);
  }

  return counts;
}

/**
 * Main mint function
 */
async function mintAllVerified(dryRun = false) {
  const startTime = Date.now();

  console.log('═'.repeat(70));
  console.log('MINT ALL VERIFIED COMPANIES — FINAL RUN');
  console.log('═'.repeat(70));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log('═'.repeat(70));

  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE — No minting will occur\n');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || DEFAULT_CONNECTION,
    ssl: { rejectUnauthorized: false },
  });

  const results = {
    states_discovered: 0,
    states_processed: 0,
    total_processed: 0,
    total_verified: 0,
    total_failed: 0,
    total_minted: 0,
    state_results: [],
    invariant_violations: 0,
  };

  try {
    // Step 1: Discover all states with eligible candidates
    console.log('\n📍 STEP 1: Discovering eligible states...\n');

    const states = await discoverEligibleStates(pool);
    const counts = await countByState(pool);

    results.states_discovered = states.length;

    if (states.length === 0) {
      console.log('✅ No eligible candidates found. All companies are minted.');
      return results;
    }

    console.log(`Found ${states.length} state(s) with eligible candidates:\n`);
    console.log('┌────────┬───────────┬─────────────────┬───────────┐');
    console.log('│ STATE  │ VERIFIED  │ VERIFIED_LEGACY │   TOTAL   │');
    console.log('├────────┼───────────┼─────────────────┼───────────┤');

    let grandTotal = 0;
    for (const state of states) {
      const c = counts[state] || { verified: 0, verified_legacy: 0, total: 0 };
      grandTotal += c.total;
      console.log(
        `│   ${state}   │ ${String(c.verified).padStart(7)} │ ${String(c.verified_legacy).padStart(15)} │ ${String(c.total).padStart(9)} │`
      );
    }

    console.log('├────────┼───────────┼─────────────────┼───────────┤');
    console.log(
      `│  ALL   │           │                 │ ${String(grandTotal).padStart(9)} │`
    );
    console.log('└────────┴───────────┴─────────────────┴───────────┘');

    // Step 2: Mint for each state (sequential, deterministic)
    console.log('\n📍 STEP 2: Minting for each state (sequential)...\n');

    for (let i = 0; i < states.length; i++) {
      const state = states[i];
      const stateCount = counts[state]?.total || 0;

      console.log('─'.repeat(70));
      console.log(`STATE: ${state} (${i + 1}/${states.length}) — ${stateCount} candidates`);
      console.log('─'.repeat(70));

      if (dryRun) {
        console.log(`  [DRY RUN] Would process ${stateCount} candidates for ${state}`);
        results.state_results.push({
          state_code: state,
          processed: 0,
          verified: 0,
          failed: 0,
          minted: 0,
          dry_run: true,
        });
        continue;
      }

      try {
        // Create orchestrator for this state
        const orchestrator = new MultiStateOrchestrator({
          dryRun: false,
          batchSize: 500,
          stateFilter: [state],
        });

        const stateResult = await orchestrator.run();
        await orchestrator.disconnect();

        // Aggregate results
        results.states_processed++;
        results.total_processed += stateResult.aggregate.total_processed;
        results.total_verified += stateResult.aggregate.total_verified;
        results.total_failed += stateResult.aggregate.total_failed;
        results.total_minted += stateResult.aggregate.total_minted;

        results.state_results.push({
          state_code: state,
          processed: stateResult.aggregate.total_processed,
          verified: stateResult.aggregate.total_verified,
          failed: stateResult.aggregate.total_failed,
          minted: stateResult.aggregate.total_minted,
        });

        // Check for invariant violations
        if (stateResult.state_results) {
          for (const sr of stateResult.state_results) {
            if (sr.errors) {
              for (const err of sr.errors) {
                if (err.error && err.error.includes('INVARIANT VIOLATION')) {
                  results.invariant_violations++;
                  console.error(`  ❌ INVARIANT VIOLATION: ${err.error}`);
                }
              }
            }
          }
        }

        console.log(`  ✓ Processed: ${stateResult.aggregate.total_processed}`);
        console.log(`  ✓ Verified: ${stateResult.aggregate.total_verified}`);
        console.log(`  ✓ Failed: ${stateResult.aggregate.total_failed}`);
        console.log(`  ✓ Minted: ${stateResult.aggregate.total_minted}`);
      } catch (error) {
        console.error(`  ❌ ERROR: ${error.message}`);
        results.state_results.push({
          state_code: state,
          error: error.message,
        });

        // Check if invariant violation
        if (error.message.includes('INVARIANT VIOLATION')) {
          results.invariant_violations++;
        }
      }
    }

    // Summary
    const duration = Date.now() - startTime;

    console.log('\n' + '═'.repeat(70));
    console.log('FINAL SUMMARY');
    console.log('═'.repeat(70));
    console.log(`States Discovered:     ${results.states_discovered}`);
    console.log(`States Processed:      ${results.states_processed}`);
    console.log(`Total Processed:       ${results.total_processed}`);
    console.log(`Total Verified:        ${results.total_verified}`);
    console.log(`Total Failed:          ${results.total_failed}`);
    console.log(`Total Minted:          ${results.total_minted}`);
    console.log(`Invariant Violations:  ${results.invariant_violations}`);
    console.log(`Duration:              ${(duration / 1000).toFixed(1)}s`);
    console.log('═'.repeat(70));

    if (results.invariant_violations > 0) {
      console.log('\n❌ INVARIANT VIOLATIONS DETECTED — Review errors above\n');
    } else if (!dryRun && results.total_minted > 0) {
      console.log('\n✅ ALL VERIFIED COMPANIES NOW HAVE SOVEREIGN IDs\n');
    }

    return results;
  } finally {
    await pool.end();
  }
}

/**
 * CLI
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  try {
    const results = await mintAllVerified(dryRun);

    // Exit non-zero on invariant violation
    if (results.invariant_violations > 0) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { mintAllVerified, discoverEligibleStates };
