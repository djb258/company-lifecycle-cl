// PASS 5: Firmographic Coherence (NOT Enrichment)
// Purpose: Detect contradictions, NOT add data
// Cost: $0 (validation only, no API calls)

import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

// ============================================
// CONFIG
// ============================================
const CONFIG = {
  BATCH_SIZE: 500,
  DRY_RUN: process.argv.includes('--dry-run'),
  LIMIT: process.argv.includes('--limit') ? parseInt(process.argv[process.argv.indexOf('--limit') + 1]) : null
};

// ============================================
// VALID US STATES
// ============================================
const VALID_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]);

// ============================================
// EMPLOYEE BAND VALIDATION
// ============================================
const EMPLOYEE_BANDS = {
  '1-10': { min: 1, max: 10 },
  '11-50': { min: 11, max: 50 },
  '51-200': { min: 51, max: 200 },
  '201-500': { min: 201, max: 500 },
  '501-1000': { min: 501, max: 1000 },
  '1001-5000': { min: 1001, max: 5000 },
  '5001-10000': { min: 5001, max: 10000 },
  '10000+': { min: 10000, max: Infinity }
};

function validateEmployeeBand(band, count) {
  if (!band || !count) return { valid: true, reason: null };

  const range = EMPLOYEE_BANDS[band];
  if (!range) return { valid: true, reason: null }; // Unknown band, can't validate

  if (count < range.min || count > range.max) {
    return {
      valid: false,
      reason: `employee_count ${count} doesn't match band ${band} (${range.min}-${range.max})`
    };
  }

  return { valid: true, reason: null };
}

// ============================================
// STATE VALIDATION
// ============================================
function validateState(state) {
  if (!state) return { valid: true, reason: null };

  const normalized = state.toUpperCase().trim();

  if (!VALID_STATES.has(normalized)) {
    return {
      valid: false,
      reason: `invalid state code: ${state}`
    };
  }

  return { valid: true, reason: null };
}

// ============================================
// SELF-CONSISTENCY CHECKS
// ============================================
function checkSelfConsistency(company) {
  const issues = [];

  // Check: Has domain but domain_health is null
  if (company.company_domain && !company.domain_health) {
    // This is just a warning, not a conflict
  }

  // Check: existence_verified but no verification timestamp
  if (company.existence_verified === true && !company.verified_at) {
    issues.push('existence_verified=true but no verified_at timestamp');
  }

  // Check: Has LinkedIn but no company name
  if (company.linkedin_company_url && !company.company_name) {
    issues.push('has linkedin_company_url but no company_name');
  }

  return issues;
}

// ============================================
// METRICS
// ============================================
const metrics = {
  processed: 0,
  pass: 0,
  fail: 0,
  skip: 0,
  stateVerified: 0,
  stateMismatch: 0,
  employeeMismatch: 0,
  selfConflict: 0
};

// ============================================
// MAIN WORKER
// ============================================
async function runPass5() {
  const client = new Client({ connectionString });
  await client.connect();

  const runId = `PASS5-${Date.now()}`;

  console.log('==========================================');
  console.log('PASS 5: FIRMOGRAPHIC COHERENCE');
  console.log('==========================================');
  console.log(`Run ID: ${runId}`);
  console.log(`Dry Run: ${CONFIG.DRY_RUN}`);
  console.log(`Limit: ${CONFIG.LIMIT || 'ALL'}`);
  console.log('==========================================\n');

  try {
    // Get companies to process (HIGH + MEDIUM confidence)
    const limitClause = CONFIG.LIMIT ? `LIMIT ${CONFIG.LIMIT}` : '';
    // Validate based on available CL data (state not available in CL spine)
    const query = `
      SELECT
        ci.company_unique_id,
        ci.company_name,
        ci.canonical_name,
        ci.existence_verified,
        ci.verified_at,
        ci.company_domain,
        ci.linkedin_company_url,
        ci.state_verified,
        ci.state_match_result,
        ic.confidence_bucket,
        cd.domain_health
      FROM cl.company_identity ci
      JOIN cl.identity_confidence ic ON ci.company_unique_id = ic.company_unique_id
      LEFT JOIN cl.company_domains cd ON ci.company_unique_id = cd.company_unique_id
      WHERE ic.confidence_bucket IN ('HIGH', 'MEDIUM')
        AND ci.state_verified IS NULL
      ORDER BY ci.created_at
      ${limitClause}
    `;

    const result = await client.query(query);
    const companies = result.rows;

    console.log(`Found ${companies.length} companies to validate\n`);

    if (companies.length === 0) {
      console.log('No companies need validation. Pass 5 complete.');
      await client.end();
      return metrics;
    }

    // Process in batches
    for (let i = 0; i < companies.length; i += CONFIG.BATCH_SIZE) {
      const batch = companies.slice(i, i + CONFIG.BATCH_SIZE);
      const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(companies.length / CONFIG.BATCH_SIZE);

      console.log(`Batch ${batchNum}/${totalBatches} (${batch.length} companies)`);

      const stateUpdates = [];
      const errorInserts = [];

      for (const company of batch) {
        metrics.processed++;

        const issues = [];

        // Use state_match_result from existence verification
        // PASS = state matched, SOFT_FAIL = state didn't match but domain passed
        const stateResult = company.state_match_result;

        // Self-consistency checks
        const selfIssues = checkSelfConsistency(company);
        if (selfIssues.length > 0) {
          issues.push(...selfIssues);
          metrics.selfConflict++;
        }

        // Determine outcome based on state_match_result and self-consistency
        if (issues.length > 0) {
          metrics.fail++;

          if (!CONFIG.DRY_RUN) {
            errorInserts.push({
              company_unique_id: company.company_unique_id,
              lifecycle_run_id: runId,
              pass_name: 'firmographic',
              failure_reason_code: 'FIRMOGRAPHIC_SELF_CONFLICT',
              inputs_snapshot: {
                company_name: company.company_name,
                state_match_result: stateResult,
                issues: issues,
                confidence_bucket: company.confidence_bucket
              }
            });
          }
        } else {
          metrics.pass++;

          // If state_match_result is PASS, mark as verified
          if (stateResult === 'PASS') {
            metrics.stateVerified++;
            stateUpdates.push({
              company_unique_id: company.company_unique_id,
              state_verified: 'VERIFIED'
            });
          } else if (stateResult === 'SOFT_FAIL') {
            // SOFT_FAIL means domain passed but state didn't match
            // Still mark as coherent but note the soft fail
            stateUpdates.push({
              company_unique_id: company.company_unique_id,
              state_verified: 'SOFT_VERIFIED'
            });
          } else {
            // No state check was performed
            stateUpdates.push({
              company_unique_id: company.company_unique_id,
              state_verified: 'NOT_CHECKED'
            });
          }
        }
      }

      // Execute batch updates
      if (!CONFIG.DRY_RUN && stateUpdates.length > 0) {
        for (const update of stateUpdates) {
          await client.query(`
            UPDATE cl.company_identity
            SET state_verified = $1
            WHERE company_unique_id = $2
          `, [update.state_verified, update.company_unique_id]);
        }
      }

      // Insert errors
      if (!CONFIG.DRY_RUN && errorInserts.length > 0) {
        for (const err of errorInserts) {
          await client.query(`
            INSERT INTO cl.cl_errors (company_unique_id, lifecycle_run_id, pass_name, failure_reason_code, inputs_snapshot)
            VALUES ($1, $2, $3, $4, $5)
          `, [err.company_unique_id, err.lifecycle_run_id, err.pass_name, err.failure_reason_code, err.inputs_snapshot]);
        }
      }

      // Progress
      console.log(`   Processed: ${metrics.processed} | Pass: ${metrics.pass} | Fail: ${metrics.fail}`);
    }

    // Final summary
    console.log('\n==========================================');
    console.log('PASS 5 COMPLETE');
    console.log('==========================================');
    console.log(`Run ID: ${runId}`);
    console.log(`Processed: ${metrics.processed}`);
    console.log(`Pass: ${metrics.pass}`);
    console.log(`Fail: ${metrics.fail}`);
    console.log(`\nIssue Breakdown:`);
    console.log(`  State verified: ${metrics.stateVerified}`);
    console.log(`  State mismatch: ${metrics.stateMismatch}`);
    console.log(`  Self-conflict:  ${metrics.selfConflict}`);
    console.log(`\nCost: $0.00 (validation only)`);

    if (!CONFIG.DRY_RUN) {
      const verifiedCount = await client.query(`
        SELECT COUNT(*) FROM cl.company_identity WHERE state_verified IS NOT NULL
      `);
      const errorCount = await client.query(`
        SELECT COUNT(*) FROM cl.cl_errors WHERE pass_name = 'firmographic'
      `);
      console.log(`\nVerification:`);
      console.log(`  Companies with state_verified: ${verifiedCount.rows[0].count}`);
      console.log(`  Firmographic errors: ${errorCount.rows[0].count}`);
    }

  } catch (error) {
    console.error('ERROR:', error.message);
    throw error;
  } finally {
    await client.end();
  }

  return metrics;
}

runPass5().catch(console.error);
