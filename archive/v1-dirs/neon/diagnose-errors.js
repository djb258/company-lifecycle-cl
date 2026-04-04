// cl.cl_errors Diagnostic Script
// Purpose: Analyze error table to understand 34,532 row count discrepancy
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function diagnoseErrors() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('\n' + '='.repeat(70));
    console.log('CL.CL_ERRORS DIAGNOSTIC REPORT');
    console.log('='.repeat(70));

    // 1. Total count
    const total = await client.query(`SELECT COUNT(*) as total FROM cl.cl_errors`);
    console.log(`\n[1] TOTAL ERROR COUNT: ${parseInt(total.rows[0].total).toLocaleString()}`);

    // 2. Distribution by pass_name
    console.log('\n[2] ERRORS BY PASS NAME:');
    const byPass = await client.query(`
      SELECT
        pass_name,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as pct
      FROM cl.cl_errors
      GROUP BY pass_name
      ORDER BY count DESC
    `);
    console.table(byPass.rows);

    // 3. Distribution by lifecycle_run_id (to detect duplicate runs)
    console.log('\n[3] ERRORS BY LIFECYCLE_RUN_ID (Top 20):');
    const byRunId = await client.query(`
      SELECT
        lifecycle_run_id,
        COUNT(*) as count,
        MIN(created_at) as first_error,
        MAX(created_at) as last_error
      FROM cl.cl_errors
      GROUP BY lifecycle_run_id
      ORDER BY count DESC
      LIMIT 20
    `);
    console.table(byRunId.rows);

    // 4. Check for potential duplicates (same company + pass + reason)
    console.log('\n[4] POTENTIAL DUPLICATES (same company_unique_id + pass_name + failure_reason_code):');
    const duplicates = await client.query(`
      SELECT
        company_unique_id,
        pass_name,
        failure_reason_code,
        COUNT(*) as duplicate_count
      FROM cl.cl_errors
      WHERE company_unique_id IS NOT NULL
      GROUP BY company_unique_id, pass_name, failure_reason_code
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
      LIMIT 20
    `);

    const dupSummary = await client.query(`
      SELECT
        COUNT(*) as groups_with_duplicates,
        SUM(cnt - 1) as excess_rows
      FROM (
        SELECT COUNT(*) as cnt
        FROM cl.cl_errors
        WHERE company_unique_id IS NOT NULL
        GROUP BY company_unique_id, pass_name, failure_reason_code
        HAVING COUNT(*) > 1
      ) dups
    `);

    if (duplicates.rows.length > 0) {
      console.table(duplicates.rows);
      console.log(`\nDuplicate Summary:`);
      console.log(`  Groups with duplicates: ${dupSummary.rows[0].groups_with_duplicates}`);
      console.log(`  Excess rows (removable): ${dupSummary.rows[0].excess_rows}`);
    } else {
      console.log('  No duplicates found based on company_unique_id + pass_name + failure_reason_code');
    }

    // 5. Errors with NULL company_unique_id (pre-mint errors)
    console.log('\n[5] ERRORS WITH NULL COMPANY_UNIQUE_ID:');
    const nullCompany = await client.query(`
      SELECT
        pass_name,
        failure_reason_code,
        COUNT(*) as count
      FROM cl.cl_errors
      WHERE company_unique_id IS NULL
      GROUP BY pass_name, failure_reason_code
      ORDER BY count DESC
    `);
    const nullTotal = nullCompany.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
    console.log(`  Total with NULL company_unique_id: ${nullTotal.toLocaleString()}`);
    if (nullCompany.rows.length > 0) {
      console.table(nullCompany.rows);
    }

    // 6. Timeline analysis - when were errors created?
    console.log('\n[6] ERROR CREATION TIMELINE (by date):');
    const timeline = await client.query(`
      SELECT
        DATE(created_at) as error_date,
        COUNT(*) as count
      FROM cl.cl_errors
      GROUP BY DATE(created_at)
      ORDER BY error_date DESC
      LIMIT 15
    `);
    console.table(timeline.rows);

    // 7. Check for migrated vs new errors (source_table in inputs_snapshot)
    console.log('\n[7] ERRORS BY SOURCE (migrated vs native):');
    const bySource = await client.query(`
      SELECT
        COALESCE(inputs_snapshot->>'source_table', 'native_cl_errors') as source,
        COUNT(*) as count
      FROM cl.cl_errors
      GROUP BY COALESCE(inputs_snapshot->>'source_table', 'native_cl_errors')
      ORDER BY count DESC
    `);
    console.table(bySource.rows);

    // 8. Check resolved vs unresolved
    console.log('\n[8] RESOLVED VS UNRESOLVED:');
    const resolved = await client.query(`
      SELECT
        CASE WHEN resolved_at IS NULL THEN 'UNRESOLVED' ELSE 'RESOLVED' END as status,
        COUNT(*) as count
      FROM cl.cl_errors
      GROUP BY CASE WHEN resolved_at IS NULL THEN 'UNRESOLVED' ELSE 'RESOLVED' END
    `);
    console.table(resolved.rows);

    // 9. Failure reason code distribution
    console.log('\n[9] TOP FAILURE REASON CODES:');
    const reasons = await client.query(`
      SELECT
        failure_reason_code,
        pass_name,
        COUNT(*) as count
      FROM cl.cl_errors
      GROUP BY failure_reason_code, pass_name
      ORDER BY count DESC
      LIMIT 15
    `);
    console.table(reasons.rows);

    // 10. Cross-reference with company_identity table
    console.log('\n[10] ERROR COMPANIES VS COMPANY_IDENTITY:');
    const crossRef = await client.query(`
      SELECT
        'Errors with valid company_unique_id' as metric,
        COUNT(DISTINCT e.company_unique_id) as count
      FROM cl.cl_errors e
      WHERE e.company_unique_id IS NOT NULL

      UNION ALL

      SELECT
        'Error company_ids NOT in company_identity' as metric,
        COUNT(DISTINCT e.company_unique_id) as count
      FROM cl.cl_errors e
      LEFT JOIN cl.company_identity ci ON e.company_unique_id = ci.company_unique_id
      WHERE e.company_unique_id IS NOT NULL
        AND ci.company_unique_id IS NULL

      UNION ALL

      SELECT
        'Total companies in company_identity' as metric,
        COUNT(*) as count
      FROM cl.company_identity
    `);
    console.table(crossRef.rows);

    console.log('\n' + '='.repeat(70));
    console.log('DIAGNOSTIC COMPLETE');
    console.log('='.repeat(70) + '\n');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

diagnoseErrors();
