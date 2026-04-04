// Cleanup errors that are now resolved
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function cleanupResolvedErrors() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('\n' + '='.repeat(70));
    console.log('CLEANUP RESOLVED ERRORS');
    console.log('='.repeat(70));

    const beforeCount = await client.query(`SELECT COUNT(*) as total FROM cl.cl_errors WHERE resolved_at IS NULL`);
    console.log(`\n[BEFORE] Unresolved errors: ${parseInt(beforeCount.rows[0].total).toLocaleString()}`);

    // 1. Mark existence errors as resolved where company is now verified
    console.log('\n[1] Resolving existence errors for verified companies...');
    const existenceResolved = await client.query(`
      UPDATE cl.cl_errors e
      SET resolved_at = NOW()
      FROM cl.company_identity ci
      WHERE e.company_unique_id = ci.company_unique_id
        AND e.pass_name = 'existence'
        AND e.resolved_at IS NULL
        AND ci.existence_verified = TRUE
      RETURNING e.error_id
    `);
    console.log(`    Resolved: ${existenceResolved.rowCount} existence errors`);

    // 2. Mark collision errors as resolved where domain is now unique
    console.log('\n[2] Resolving collision errors for now-unique domains...');
    const collisionResolved = await client.query(`
      WITH unique_domains AS (
        SELECT company_domain
        FROM cl.company_identity
        WHERE company_domain IS NOT NULL AND company_domain != ''
        GROUP BY company_domain
        HAVING COUNT(*) = 1
      )
      UPDATE cl.cl_errors e
      SET resolved_at = NOW()
      FROM cl.company_identity ci
      WHERE e.company_unique_id = ci.company_unique_id
        AND e.failure_reason_code = 'COLLISION_DOMAIN'
        AND e.resolved_at IS NULL
        AND ci.company_domain IN (SELECT company_domain FROM unique_domains)
      RETURNING e.error_id
    `);
    console.log(`    Resolved: ${collisionResolved.rowCount} collision errors`);

    // 3. Summary
    const afterCount = await client.query(`SELECT COUNT(*) as total FROM cl.cl_errors WHERE resolved_at IS NULL`);
    console.log(`\n[AFTER] Unresolved errors: ${parseInt(afterCount.rows[0].total).toLocaleString()}`);

    const resolvedCount = await client.query(`SELECT COUNT(*) as total FROM cl.cl_errors WHERE resolved_at IS NOT NULL`);
    console.log(`[AFTER] Resolved errors: ${parseInt(resolvedCount.rows[0].total).toLocaleString()}`);

    // 4. Breakdown of remaining
    console.log('\n[REMAINING] Errors by type:');
    const remaining = await client.query(`
      SELECT pass_name, failure_reason_code, COUNT(*) as count
      FROM cl.cl_errors
      WHERE resolved_at IS NULL
      GROUP BY pass_name, failure_reason_code
      ORDER BY count DESC
    `);
    console.table(remaining.rows);

    console.log('\n' + '='.repeat(70));
    console.log('CLEANUP COMPLETE');
    console.log('='.repeat(70) + '\n');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

cleanupResolvedErrors();
