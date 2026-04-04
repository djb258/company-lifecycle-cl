// Analyze existence and collision errors in detail
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function analyze() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('='.repeat(70));
  console.log('EXISTENCE & COLLISION ERROR ANALYSIS');
  console.log('='.repeat(70));

  // EXISTENCE ERRORS
  console.log('\n' + '-'.repeat(70));
  console.log('EXISTENCE ERRORS');
  console.log('-'.repeat(70));

  const existenceByReason = await client.query(`
    SELECT
      failure_reason_code,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved,
      COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved
    FROM cl.cl_errors
    WHERE pass_name = 'existence'
    GROUP BY failure_reason_code
    ORDER BY total DESC
  `);
  console.log('\nExistence by failure_reason_code:');
  console.table(existenceByReason.rows);

  // DOMAIN_FAIL categories
  const domainFailCategories = await client.query(`
    SELECT
      inputs_snapshot->>'error_category' as category,
      COUNT(*) as count
    FROM cl.cl_errors
    WHERE pass_name = 'existence'
      AND failure_reason_code = 'DOMAIN_FAIL'
    GROUP BY inputs_snapshot->>'error_category'
    ORDER BY count DESC
  `);
  console.log('\nDOMAIN_FAIL by category:');
  console.table(domainFailCategories.rows);

  // COLLISION ERRORS
  console.log('\n' + '-'.repeat(70));
  console.log('COLLISION ERRORS');
  console.log('-'.repeat(70));

  const collisionByReason = await client.query(`
    SELECT
      failure_reason_code,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved,
      COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved
    FROM cl.cl_errors
    WHERE pass_name = 'collision'
    GROUP BY failure_reason_code
    ORDER BY total DESC
  `);
  console.log('\nCollision by failure_reason_code:');
  console.table(collisionByReason.rows);

  // Resolved collision errors - what resolved them?
  const collisionResolutions = await client.query(`
    SELECT
      inputs_snapshot->>'resolution' as resolution,
      COUNT(*) as count
    FROM cl.cl_errors
    WHERE pass_name = 'collision'
      AND resolved_at IS NOT NULL
    GROUP BY inputs_snapshot->>'resolution'
    ORDER BY count DESC
    LIMIT 10
  `);
  console.log('\nCollision resolved by:');
  console.table(collisionResolutions.rows);

  // When were collision errors created vs resolved?
  const collisionTimeline = await client.query(`
    SELECT
      DATE(created_at) as created_date,
      COUNT(*) as created_count,
      COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved_count,
      COUNT(*) FILTER (WHERE DATE(resolved_at) = DATE(created_at)) as same_day_resolved
    FROM cl.cl_errors
    WHERE pass_name = 'collision'
    GROUP BY DATE(created_at)
    ORDER BY created_date DESC
  `);
  console.log('\nCollision timeline:');
  console.table(collisionTimeline.rows);

  // CROSS-CHECK: Companies with both existence and collision errors
  const overlap = await client.query(`
    SELECT COUNT(DISTINCT e1.company_unique_id) as overlap_count
    FROM cl.cl_errors e1
    JOIN cl.cl_errors e2 ON e1.company_unique_id = e2.company_unique_id
    WHERE e1.pass_name = 'existence'
      AND e2.pass_name = 'collision'
  `);
  console.log(`\nCompanies with BOTH existence and collision errors: ${overlap.rows[0].overlap_count}`);

  // Total unique companies in error table
  const totalUniqueCompanies = await client.query(`
    SELECT
      COUNT(DISTINCT company_unique_id) as total_unique,
      COUNT(DISTINCT company_unique_id) FILTER (WHERE pass_name = 'existence') as existence_unique,
      COUNT(DISTINCT company_unique_id) FILTER (WHERE pass_name = 'collision') as collision_unique
    FROM cl.cl_errors
  `);
  console.log('\nUnique company breakdown:');
  console.table(totalUniqueCompanies.rows);

  // What's in company_identity?
  const identityCount = await client.query(`
    SELECT COUNT(*) as total FROM cl.company_identity
  `);
  console.log(`\nTotal in company_identity: ${identityCount.rows[0].total}`);

  // Existence verified status
  const verifiedStatus = await client.query(`
    SELECT
      existence_verified,
      COUNT(*) as count
    FROM cl.company_identity
    GROUP BY existence_verified
  `);
  console.log('\nExistence verified status:');
  console.table(verifiedStatus.rows);

  await client.end();
}

analyze().catch(console.error);
