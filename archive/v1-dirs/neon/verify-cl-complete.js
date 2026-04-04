// Verify CL Sovereign ID and schema cleanup is complete
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function verify() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('='.repeat(70));
  console.log('CL SOVEREIGN ID & CLEANUP VERIFICATION');
  console.log('='.repeat(70));

  // 1. Sovereign ID coverage
  console.log('\n1. SOVEREIGN_COMPANY_ID COVERAGE');
  console.log('-'.repeat(50));
  const sovereignCoverage = await client.query(`
    SELECT
      COUNT(*) as total,
      COUNT(sovereign_company_id) as has_sovereign_id,
      COUNT(*) - COUNT(sovereign_company_id) as missing_sovereign_id
    FROM cl.company_identity
  `);
  console.table(sovereignCoverage.rows);

  // 2. Final outcome distribution
  console.log('\n2. FINAL_OUTCOME DISTRIBUTION');
  console.log('-'.repeat(50));
  const outcomeDistribution = await client.query(`
    SELECT
      final_outcome,
      COUNT(*) as count,
      ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 1) as pct
    FROM cl.company_identity
    GROUP BY final_outcome
    ORDER BY count DESC
  `);
  console.table(outcomeDistribution.rows);

  // 3. PASS breakdown by final_reason
  console.log('\n3. PASS BREAKDOWN BY REASON');
  console.log('-'.repeat(50));
  const passBreakdown = await client.query(`
    SELECT final_reason, COUNT(*) as count
    FROM cl.company_identity
    WHERE final_outcome = 'PASS'
    GROUP BY final_reason
    ORDER BY count DESC
  `);
  console.table(passBreakdown.rows);

  // 4. FAIL breakdown by final_reason
  console.log('\n4. FAIL BREAKDOWN BY REASON');
  console.log('-'.repeat(50));
  const failBreakdown = await client.query(`
    SELECT final_reason, COUNT(*) as count
    FROM cl.company_identity
    WHERE final_outcome = 'FAIL'
    GROUP BY final_reason
    ORDER BY count DESC
  `);
  console.table(failBreakdown.rows);

  // 5. Error table status (should be 0 - work queue)
  console.log('\n5. CL.CL_ERRORS (WORK QUEUE - SHOULD BE 0)');
  console.log('-'.repeat(50));
  const errorCount = await client.query(`SELECT COUNT(*) as active_errors FROM cl.cl_errors`);
  const archiveCount = await client.query(`SELECT COUNT(*) as archived_errors FROM cl.cl_errors_archive`);
  console.log('Active errors:', errorCount.rows[0].active_errors);
  console.log('Archived errors:', archiveCount.rows[0].archived_errors);

  // 6. Promotable view status
  console.log('\n6. CL.V_COMPANY_PROMOTABLE VIEW');
  console.log('-'.repeat(50));
  const promotableCount = await client.query(`SELECT COUNT(*) as promotable FROM cl.v_company_promotable`);
  console.log('Promotable companies:', promotableCount.rows[0].promotable);

  // 7. Domain hierarchy status
  console.log('\n7. CL.DOMAIN_HIERARCHY');
  console.log('-'.repeat(50));
  const hierarchyStats = await client.query(`
    SELECT relationship_type, COUNT(*) as count
    FROM cl.domain_hierarchy
    GROUP BY relationship_type
    ORDER BY count DESC
  `);
  console.table(hierarchyStats.rows);

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));

  const total = parseInt(sovereignCoverage.rows[0].total);
  const hasSovereign = parseInt(sovereignCoverage.rows[0].has_sovereign_id);
  const activeErrors = parseInt(errorCount.rows[0].active_errors);
  const promotable = parseInt(promotableCount.rows[0].promotable);

  console.log(`✓ Total companies: ${total}`);
  console.log(`✓ Sovereign ID coverage: ${hasSovereign}/${total} (${(100*hasSovereign/total).toFixed(1)}%)`);
  console.log(`✓ Active errors: ${activeErrors} (work queue ${activeErrors === 0 ? 'CLEAN' : 'NOT CLEAN'})`);
  console.log(`✓ Promotable to Outreach: ${promotable}`);

  if (hasSovereign === total && activeErrors === 0) {
    console.log('\n✅ CL SOVEREIGN ID & CLEANUP: COMPLETE');
  } else {
    console.log('\n⚠️  CL needs attention');
  }

  await client.end();
}

verify().catch(console.error);
