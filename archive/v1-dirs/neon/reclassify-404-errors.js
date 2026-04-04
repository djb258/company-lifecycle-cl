// Reclassify HTTP 404 errors as DOMAIN_EXISTS
// 404 = domain resolves, page missing ≠ dead company
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function reclassify404Errors() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('\n' + '='.repeat(60));
    console.log('RECLASSIFY 404 ERRORS AS DOMAIN_EXISTS');
    console.log('='.repeat(60));

    // Count before
    const before = await client.query(`
      SELECT COUNT(*) as cnt FROM cl.cl_errors
      WHERE failure_reason_code = 'DOMAIN_FAIL'
        AND inputs_snapshot->>'domain_error' = 'HTTP 404'
        AND resolved_at IS NULL
    `);
    console.log(`\n[BEFORE] 404 errors to reclassify: ${before.rows[0].cnt}`);

    if (parseInt(before.rows[0].cnt) === 0) {
      console.log('No 404 errors to reclassify.');
      return;
    }

    // Get company IDs for these errors first
    const errorCompanies = await client.query(`
      SELECT DISTINCT company_unique_id
      FROM cl.cl_errors
      WHERE failure_reason_code = 'DOMAIN_FAIL'
        AND inputs_snapshot->>'domain_error' = 'HTTP 404'
        AND resolved_at IS NULL
        AND company_unique_id IS NOT NULL
    `);
    const companyIds = errorCompanies.rows.map(r => r.company_unique_id);
    console.log(`Companies affected: ${companyIds.length}`);

    // Update errors: resolve as DOMAIN_EXISTS
    const result = await client.query(`
      UPDATE cl.cl_errors
      SET resolved_at = NOW(),
          inputs_snapshot = inputs_snapshot || $1::jsonb
      WHERE failure_reason_code = 'DOMAIN_FAIL'
        AND inputs_snapshot->>'domain_error' = 'HTTP 404'
        AND resolved_at IS NULL
      RETURNING error_id
    `, [JSON.stringify({
      resolution: 'DOMAIN_EXISTS',
      resolution_reason: 'HTTP_404_means_domain_resolves_page_missing',
      tool_used: 'manual_reclassification',
      tier: 0
    })]);
    console.log(`[RESOLVED] ${result.rowCount} errors marked as DOMAIN_EXISTS`);

    // Update company_identity to mark existence_verified = TRUE
    if (companyIds.length > 0) {
      const companyUpdate = await client.query(`
        UPDATE cl.company_identity
        SET existence_verified = TRUE,
            verified_at = NOW()
        WHERE company_unique_id = ANY($1)
          AND (existence_verified = FALSE OR existence_verified IS NULL)
        RETURNING company_unique_id
      `, [companyIds]);
      console.log(`[VERIFIED] ${companyUpdate.rowCount} companies marked as existence_verified = TRUE`);
    }

    // Summary
    const after = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved,
        COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved
      FROM cl.cl_errors
      WHERE failure_reason_code = 'DOMAIN_FAIL'
    `);
    console.log('\n[AFTER] DOMAIN_FAIL status:');
    console.table(after.rows);

    // Overall error status
    const overall = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved,
        COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved
      FROM cl.cl_errors
    `);
    console.log('\n[OVERALL] cl.cl_errors status:');
    console.table(overall.rows);

    console.log('\n' + '='.repeat(60));
    console.log('RECLASSIFICATION COMPLETE');
    console.log('='.repeat(60) + '\n');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

reclassify404Errors();
