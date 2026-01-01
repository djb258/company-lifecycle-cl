// Phase E: Audit + Rollback Plan
// Produces counts, diffs, and rollback SQL

import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function runPhaseE() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('========================================');
    console.log('PHASE E: Audit + Rollback Plan');
    console.log('========================================\n');

    const report = {
      timestamp: new Date().toISOString(),
      phase: 'PHASE E - AUDIT & ROLLBACK',
      counts: {},
      diffs: {},
      rollback: []
    };

    // 1. COUNTS
    console.log('1. COUNTS');
    console.log('---------');

    const sourceCount = await client.query('SELECT COUNT(*) as cnt FROM company.company_master');
    report.counts.source = parseInt(sourceCount.rows[0].cnt);
    console.log('Source (company.company_master): ' + report.counts.source);

    const stagingCount = await client.query('SELECT COUNT(*) as cnt FROM cl.company_lifecycle_identity_staging');
    report.counts.staging = parseInt(stagingCount.rows[0].cnt);
    console.log('Staging (cl.company_lifecycle_identity_staging): ' + report.counts.staging);

    const identityCount = await client.query('SELECT COUNT(*) as cnt FROM cl.company_identity');
    report.counts.identity = parseInt(identityCount.rows[0].cnt);
    console.log('Identity (cl.company_identity): ' + report.counts.identity);

    const bridgeCount = await client.query('SELECT COUNT(*) as cnt FROM cl.company_identity_bridge');
    report.counts.bridge = parseInt(bridgeCount.rows[0].cnt);
    console.log('Bridge (cl.company_identity_bridge): ' + report.counts.bridge);

    const errorCount = await client.query('SELECT COUNT(*) as cnt FROM cl.company_lifecycle_error');
    report.counts.errors = parseInt(errorCount.rows[0].cnt);
    console.log('Errors (cl.company_lifecycle_error): ' + report.counts.errors);

    // 2. DIFFS
    console.log('\n2. DIFFS');
    console.log('--------');

    report.diffs.sourceMapped = report.counts.staging;
    report.diffs.eligible = report.counts.identity;
    report.diffs.ineligible = report.counts.errors;
    report.diffs.total = report.counts.identity + report.counts.errors;

    console.log('Source records mapped to staging: ' + report.diffs.sourceMapped);
    console.log('Eligible (minted to identity): ' + report.diffs.eligible);
    console.log('Ineligible (routed to errors): ' + report.diffs.ineligible);
    console.log('Total processed: ' + report.diffs.total);

    const delta = report.counts.source - report.diffs.total;
    console.log('Delta (source - processed): ' + delta);
    if (delta !== 0) {
      console.log('⚠️  WARNING: Delta is non-zero!');
    } else {
      console.log('✓ All source records accounted for');
    }

    // Staging status breakdown
    const stagingStatus = await client.query(`
      SELECT eligibility_status, COUNT(*) as cnt
      FROM cl.company_lifecycle_identity_staging
      GROUP BY eligibility_status
      ORDER BY eligibility_status
    `);
    console.log('\nStaging breakdown:');
    stagingStatus.rows.forEach(r => console.log('  - ' + r.eligibility_status + ': ' + r.cnt));

    // Error breakdown
    const errorBreakdown = await client.query(`
      SELECT failure_reason, status, COUNT(*) as cnt
      FROM cl.company_lifecycle_error
      GROUP BY failure_reason, status
      ORDER BY failure_reason
    `);
    console.log('\nError breakdown:');
    errorBreakdown.rows.forEach(r => console.log('  - ' + r.failure_reason + ' (' + r.status + '): ' + r.cnt));

    // 3. ROLLBACK PLAN
    console.log('\n3. ROLLBACK PLAN');
    console.log('----------------');
    console.log('To rollback this migration, execute the following SQL in order:\n');

    const rollbackSql = `
-- ROLLBACK SCRIPT FOR CL BOOTSTRAP
-- Generated: ${report.timestamp}
-- WARNING: This will delete all data created by the bootstrap

-- Step 1: Delete bridge mappings
DELETE FROM cl.company_identity_bridge
WHERE minted_by = 'cl_bootstrap_phase_c';

-- Step 2: Delete minted identities
DELETE FROM cl.company_identity
WHERE source_system IN (
  SELECT DISTINCT source_system
  FROM cl.company_lifecycle_identity_staging
);

-- Step 3: Delete errors
DELETE FROM cl.company_lifecycle_error;

-- Step 4: Delete staging data
DELETE FROM cl.company_lifecycle_identity_staging;

-- Verification queries:
-- SELECT COUNT(*) FROM cl.company_identity; -- Should be 0
-- SELECT COUNT(*) FROM cl.company_identity_bridge; -- Should be 0
-- SELECT COUNT(*) FROM cl.company_lifecycle_error; -- Should be 0
-- SELECT COUNT(*) FROM cl.company_lifecycle_identity_staging; -- Should be 0
`;

    console.log(rollbackSql);
    report.rollback = rollbackSql;

    // 4. SUMMARY
    console.log('\n========================================');
    console.log('BOOTSTRAP SUMMARY');
    console.log('========================================');
    console.log('Timestamp: ' + report.timestamp);
    console.log('');
    console.log('| Table | Count |');
    console.log('|-------|-------|');
    console.log('| Source (company.company_master) | ' + report.counts.source + ' |');
    console.log('| Staging | ' + report.counts.staging + ' |');
    console.log('| Identity (minted) | ' + report.counts.identity + ' |');
    console.log('| Bridge (mapped) | ' + report.counts.bridge + ' |');
    console.log('| Errors (failed) | ' + report.counts.errors + ' |');
    console.log('');
    console.log('Status: ' + (delta === 0 ? '✅ SUCCESS' : '⚠️ DELTA MISMATCH'));
    console.log('');
    console.log('========================================');
    console.log('PHASE E: COMPLETE');
    console.log('========================================');

    return report;

  } catch (error) {
    console.error('ERROR:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

runPhaseE();
