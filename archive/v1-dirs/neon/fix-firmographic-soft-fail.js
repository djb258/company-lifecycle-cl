// Fix FIRMOGRAPHIC_STATE_MISMATCH errors caused by SOFT_FAIL
// SOFT_FAIL is a valid internal status, not an invalid state code
// Option B: Resolve as "not an error" without GooglePlaces lookup
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function fixFirmographicSoftFail() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('\n' + '='.repeat(60));
    console.log('FIX FIRMOGRAPHIC SOFT_FAIL ERRORS');
    console.log('Option B: Resolve as valid internal status');
    console.log('='.repeat(60));

    // Count before
    const before = await client.query(`
      SELECT COUNT(*) as cnt FROM cl.cl_errors
      WHERE failure_reason_code = 'FIRMOGRAPHIC_STATE_MISMATCH'
        AND resolved_at IS NULL
    `);
    console.log(`\n[BEFORE] Unresolved FIRMOGRAPHIC_STATE_MISMATCH: ${before.rows[0].cnt}`);

    // Check how many have internal status values as the "invalid" state
    const statusBreakdown = await client.query(`
      SELECT inputs_snapshot->>'address_state' as address_state, COUNT(*) as cnt
      FROM cl.cl_errors
      WHERE failure_reason_code = 'FIRMOGRAPHIC_STATE_MISMATCH'
        AND resolved_at IS NULL
      GROUP BY inputs_snapshot->>'address_state'
    `);
    console.log('\n  Address state breakdown:');
    console.table(statusBreakdown.rows);

    // Fix SOFT_FAIL errors
    const softFailResult = await client.query(`
      UPDATE cl.cl_errors
      SET resolved_at = NOW(),
          tool_used = 'manual_reclassification',
          tool_tier = 0,
          inputs_snapshot = inputs_snapshot || $1::jsonb
      WHERE failure_reason_code = 'FIRMOGRAPHIC_STATE_MISMATCH'
        AND resolved_at IS NULL
        AND inputs_snapshot->>'address_state' = 'SOFT_FAIL'
      RETURNING error_id
    `, [JSON.stringify({
      resolution: 'SOFT_FAIL_IS_VALID_STATUS',
      resolution_reason: 'SOFT_FAIL indicates domain passed but state match was inconclusive - this is expected behavior not an error',
      fix_applied: 'Option B - resolve as valid without GooglePlaces lookup'
    })]);
    console.log(`\n[RESOLVED] ${softFailResult.rowCount} SOFT_FAIL errors`);

    // Fix PASS errors - PASS is also an internal status, not a state code
    const passResult = await client.query(`
      UPDATE cl.cl_errors
      SET resolved_at = NOW(),
          tool_used = 'manual_reclassification',
          tool_tier = 0,
          inputs_snapshot = inputs_snapshot || $1::jsonb
      WHERE failure_reason_code = 'FIRMOGRAPHIC_STATE_MISMATCH'
        AND resolved_at IS NULL
        AND inputs_snapshot->>'address_state' = 'PASS'
      RETURNING error_id
    `, [JSON.stringify({
      resolution: 'PASS_IS_VALID_STATUS',
      resolution_reason: 'PASS indicates both domain AND state verification passed - this is expected behavior not an error',
      fix_applied: 'Option B - resolve as valid without GooglePlaces lookup'
    })]);
    console.log(`[RESOLVED] ${passResult.rowCount} PASS errors`);

    // Also update the companies to set state_verified if not already set
    const companyUpdate = await client.query(`
      UPDATE cl.company_identity ci
      SET state_verified = 'SOFT_VERIFIED'
      FROM cl.cl_errors e
      WHERE e.company_unique_id = ci.company_unique_id
        AND e.failure_reason_code = 'FIRMOGRAPHIC_STATE_MISMATCH'
        AND e.inputs_snapshot->>'resolution' = 'SOFT_FAIL_IS_VALID_STATUS'
        AND (ci.state_verified IS NULL OR ci.state_verified = '')
      RETURNING ci.company_unique_id
    `);
    console.log(`[UPDATED] ${companyUpdate.rowCount} companies set to state_verified = 'SOFT_VERIFIED'`);

    // Summary
    const after = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved,
        COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved
      FROM cl.cl_errors
      WHERE failure_reason_code = 'FIRMOGRAPHIC_STATE_MISMATCH'
    `);
    console.log('\n[AFTER] FIRMOGRAPHIC_STATE_MISMATCH:');
    console.table(after.rows);

    // Overall firmographic errors
    const firmographicAll = await client.query(`
      SELECT
        failure_reason_code,
        COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved,
        COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved
      FROM cl.cl_errors
      WHERE pass_name = 'firmographic'
      GROUP BY failure_reason_code
    `);
    console.log('\n[OVERALL] All firmographic errors:');
    console.table(firmographicAll.rows);

    console.log('\n' + '='.repeat(60));
    console.log('FIX COMPLETE');
    console.log('='.repeat(60));
    console.log(`
Explanation:
- SOFT_FAIL is an internal status from state_match_result
- It means: "domain verification passed, but state couldn't be verified"
- This is EXPECTED behavior, not an error
- No GooglePlaces lookup needed (Option B)
- Cost: $0.00
    `);

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

fixFirmographicSoftFail();
