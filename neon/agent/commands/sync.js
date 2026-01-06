// Sync Command - Sync identity_status with verification results

import { getClient } from '../lib/db.js';

export async function syncIdentityStatus(options) {
  console.log('='.repeat(60));
  console.log('NEON AGENT: STATUS SYNC');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Dry Run: ${options.dryRun || false}`);
  console.log(`Force: ${options.force || false}`);
  console.log('');

  const client = await getClient();

  try {
    // Check current state
    console.log('CURRENT STATE');
    console.log('-'.repeat(40));

    const currentState = await client.query(`
      SELECT
        identity_status,
        COUNT(*) as cnt
      FROM cl.company_identity
      GROUP BY identity_status
      ORDER BY cnt DESC
    `);

    currentState.rows.forEach(r => {
      console.log(`  ${r.identity_status || 'NULL'}: ${r.cnt}`);
    });

    // Find records that need syncing
    let needsSync;
    if (options.force) {
      needsSync = await client.query(`
        SELECT COUNT(*) as cnt FROM cl.company_identity
      `);
    } else {
      needsSync = await client.query(`
        SELECT COUNT(*) as cnt FROM cl.company_identity
        WHERE (existence_verified = TRUE AND identity_status != 'PASS')
           OR (existence_verified = FALSE AND identity_status != 'FAIL')
           OR (identity_status IS NULL)
           OR (identity_status = 'PENDING')
      `);
    }

    console.log(`\nRecords needing sync: ${needsSync.rows[0].cnt}`);

    if (parseInt(needsSync.rows[0].cnt) === 0) {
      console.log('All records are already synced');
      return;
    }

    if (options.dryRun) {
      console.log('\nDRY RUN - Would sync:');

      const wouldPass = await client.query(`
        SELECT COUNT(*) as cnt FROM cl.company_identity
        WHERE existence_verified = TRUE
          AND (identity_status IS NULL OR identity_status != 'PASS')
      `);
      console.log(`  Set to PASS: ${wouldPass.rows[0].cnt}`);

      const wouldFail = await client.query(`
        SELECT COUNT(*) as cnt FROM cl.company_identity
        WHERE existence_verified = FALSE
          AND (identity_status IS NULL OR identity_status != 'FAIL')
      `);
      console.log(`  Set to FAIL: ${wouldFail.rows[0].cnt}`);

      return;
    }

    // Execute sync
    console.log('\nEXECUTING SYNC');
    console.log('-'.repeat(40));

    await client.query('BEGIN');

    // Set PASS for verified
    const passResult = await client.query(`
      UPDATE cl.company_identity
      SET identity_status = 'PASS'
      WHERE existence_verified = TRUE
        AND (identity_status IS NULL OR identity_status = 'PENDING' OR $1)
      RETURNING company_unique_id
    `, [options.force || false]);
    console.log(`  Set to PASS: ${passResult.rowCount}`);

    // Set FAIL for failed
    const failResult = await client.query(`
      UPDATE cl.company_identity
      SET identity_status = 'FAIL'
      WHERE existence_verified = FALSE
        AND (identity_status IS NULL OR identity_status = 'PENDING' OR $1)
      RETURNING company_unique_id
    `, [options.force || false]);
    console.log(`  Set to FAIL: ${failResult.rowCount}`);

    await client.query('COMMIT');

    // Show new state
    console.log('\nNEW STATE');
    console.log('-'.repeat(40));

    const newState = await client.query(`
      SELECT
        identity_status,
        COUNT(*) as cnt
      FROM cl.company_identity
      GROUP BY identity_status
      ORDER BY cnt DESC
    `);

    newState.rows.forEach(r => {
      console.log(`  ${r.identity_status}: ${r.cnt}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('SYNC COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}
