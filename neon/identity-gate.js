// ============================================================================
// IDENTITY GATE - Outreach Entry Gate
// ============================================================================
// DOCTRINE: This is BEHAVIOR-ONLY. No data mutation.
// - Reads from cl.v_company_identity_eligible VIEW
// - eligible_for_outreach = (identity_pass >= 1 AND identity_status = 'PASS')
// - existence_verified is INFORMATIONAL ONLY
//
// ROLLBACK: Drop VIEW + set ENFORCE_IDENTITY_GATE=false
// ============================================================================

import pg from 'pg';
const { Client } = pg;

// Kill switch - set to false to disable gate enforcement
const ENFORCE_IDENTITY_GATE = process.env.ENFORCE_IDENTITY_GATE !== 'false';

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

/**
 * Get eligible companies for outreach
 * DOCTRINE: Only returns records where eligible_for_outreach = TRUE
 *
 * @param {object} options - Query options
 * @param {number} options.limit - Max records to return
 * @param {string} options.runId - Run ID for audit logging
 * @returns {Promise<Array>} Eligible company records
 */
export async function getEligibleCompanies(options = {}) {
  const { limit = 1000, runId = `GATE-${Date.now()}` } = options;
  const client = new Client({ connectionString });

  try {
    await client.connect();

    // Gate check: scan and audit before returning
    const auditResult = await auditGateCheck(client, runId, 'OUTREACH_ENTRY');

    if (ENFORCE_IDENTITY_GATE) {
      // ENFORCED: Only return eligible records
      const result = await client.query(`
        SELECT *
        FROM cl.v_company_identity_eligible
        WHERE eligible_for_outreach = TRUE
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit]);

      console.log(`[IDENTITY_GATE] Returned ${result.rows.length} eligible records (gate ENFORCED)`);
      return result.rows;

    } else {
      // BYPASSED: Return all records (emergency rollback mode)
      console.warn('[IDENTITY_GATE] ⚠️  Gate BYPASSED - ENFORCE_IDENTITY_GATE=false');
      const result = await client.query(`
        SELECT *, TRUE as eligible_for_outreach, 'BYPASSED' as eligibility_reason
        FROM cl.company_identity
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit]);

      return result.rows;
    }

  } finally {
    await client.end();
  }
}

/**
 * Validate a single company passes the identity gate
 * Use this before processing any record downstream
 *
 * @param {string} companyUniqueId - Company UUID
 * @param {string} runId - Run ID for audit
 * @param {string} stage - Processing stage name
 * @returns {Promise<{valid: boolean, reason: string, record: object|null}>}
 */
export async function validateIdentityGate(companyUniqueId, runId, stage = 'VALIDATION') {
  const client = new Client({ connectionString });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT *
      FROM cl.v_company_identity_eligible
      WHERE company_unique_id = $1
    `, [companyUniqueId]);

    if (result.rows.length === 0) {
      return { valid: false, reason: 'NOT_FOUND', record: null };
    }

    const record = result.rows[0];

    if (!ENFORCE_IDENTITY_GATE) {
      console.warn(`[IDENTITY_GATE] Gate bypassed for ${companyUniqueId}`);
      return { valid: true, reason: 'BYPASSED', record };
    }

    if (record.eligible_for_outreach) {
      return { valid: true, reason: 'PASS', record };
    }

    // GATE FAILED - log to failures table
    await logGateFailure(client, {
      companyUniqueId,
      runId,
      stage,
      errorCode: 'CT_UPSTREAM_IDENTITY_NOT_APPROVED',
      eligibilityReason: record.eligibility_reason,
      identityPass: record.identity_pass,
      identityStatus: record.identity_status,
      existenceVerified: record.existence_verified
    });

    return {
      valid: false,
      reason: record.eligibility_reason,
      record
    };

  } finally {
    await client.end();
  }
}

/**
 * Audit a gate check run
 * Logs summary statistics to cl.identity_gate_audit
 */
async function auditGateCheck(client, runId, stage) {
  const stats = await client.query(`
    SELECT
      COUNT(*) as total_scanned,
      COUNT(*) FILTER (WHERE eligible_for_outreach = TRUE) as eligible_count,
      COUNT(*) FILTER (WHERE eligible_for_outreach = FALSE) as blocked_count,
      jsonb_object_agg(
        COALESCE(eligibility_reason, 'UNKNOWN'),
        reason_count
      ) as blocked_reasons
    FROM (
      SELECT
        eligible_for_outreach,
        eligibility_reason,
        COUNT(*) as reason_count
      FROM cl.v_company_identity_eligible
      WHERE eligible_for_outreach = FALSE
      GROUP BY eligible_for_outreach, eligibility_reason

      UNION ALL

      SELECT
        TRUE as eligible_for_outreach,
        'PASS' as eligibility_reason,
        COUNT(*) as reason_count
      FROM cl.v_company_identity_eligible
      WHERE eligible_for_outreach = TRUE
    ) sub
  `);

  const row = stats.rows[0];

  // Get sample blocked IDs
  const sampleBlocked = await client.query(`
    SELECT company_unique_id
    FROM cl.v_company_identity_eligible
    WHERE eligible_for_outreach = FALSE
    LIMIT 10
  `);

  await client.query(`
    INSERT INTO cl.identity_gate_audit
    (run_id, stage, total_scanned, eligible_count, blocked_count, sample_blocked_ids, blocked_reasons, gate_enforced)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    runId,
    stage,
    parseInt(row.total_scanned) || 0,
    parseInt(row.eligible_count) || 0,
    parseInt(row.blocked_count) || 0,
    sampleBlocked.rows.map(r => r.company_unique_id),
    row.blocked_reasons || {},
    ENFORCE_IDENTITY_GATE
  ]);

  console.log(`[IDENTITY_GATE] Audit logged: ${row.eligible_count} eligible, ${row.blocked_count} blocked`);

  return row;
}

/**
 * Log a gate failure
 * Called when an ineligible record reaches downstream
 */
async function logGateFailure(client, failure) {
  await client.query(`
    INSERT INTO cl.identity_gate_failures
    (company_unique_id, run_id, stage, error_code, eligibility_reason, identity_pass, identity_status, existence_verified)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    failure.companyUniqueId,
    failure.runId,
    failure.stage,
    failure.errorCode,
    failure.eligibilityReason,
    failure.identityPass,
    failure.identityStatus,
    failure.existenceVerified
  ]);

  console.error(`[IDENTITY_GATE] ❌ GATE FAILURE: ${failure.errorCode} for ${failure.companyUniqueId}`);
}

/**
 * Get gate status summary
 * Use for monitoring dashboards
 */
export async function getGateSummary() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    const result = await client.query('SELECT * FROM cl.v_identity_gate_summary');
    return {
      ...result.rows[0],
      gateEnforced: ENFORCE_IDENTITY_GATE
    };
  } finally {
    await client.end();
  }
}

// CLI usage
if (process.argv[1].includes('identity-gate')) {
  const command = process.argv[2];

  if (command === 'summary') {
    getGateSummary().then(summary => {
      console.log('\n=== IDENTITY GATE SUMMARY ===');
      console.log('Gate Enforced:', summary.gateEnforced ? 'YES' : 'NO (BYPASSED)');
      console.log('Total Companies:', summary.total_companies);
      console.log('Eligible:', summary.eligible_count, `(${summary.eligible_pct}%)`);
      console.log('Blocked:', summary.blocked_count);
      console.log('\nBlocked Breakdown:');
      console.log('  PENDING:', summary.pending_count);
      console.log('  FAIL_DOMAIN:', summary.fail_domain_count);
      console.log('  FAIL_STATE:', summary.fail_state_count);
      console.log('  FAIL_NAME:', summary.fail_name_count);
      console.log('  UNKNOWN:', summary.unknown_count);
    }).catch(console.error);
  } else {
    console.log('Usage: node identity-gate.js summary');
  }
}
