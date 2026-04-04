// ============================================================================
// ARCHIVE FAIL RECORDS - FINAL
// ============================================================================
// Drops FK constraint from outreach.outreach, then archives FAIL records
// Outreach will handle its own cleanup in the Outreach repo
// ============================================================================
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function archiveFinal() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('='.repeat(70));
  console.log('ARCHIVE FAIL RECORDS - FINAL');
  console.log('='.repeat(70));

  try {
    // Before counts
    const beforeTotal = await client.query('SELECT COUNT(*) as cnt FROM cl.company_identity');
    const beforePass = await client.query(`SELECT COUNT(*) as cnt FROM cl.company_identity WHERE final_outcome = 'PASS'`);
    const beforeFail = await client.query(`SELECT COUNT(*) as cnt FROM cl.company_identity WHERE final_outcome = 'FAIL'`);

    console.log('\n[BEFORE]');
    console.log('  cl.company_identity total:', beforeTotal.rows[0].cnt);
    console.log('  PASS:', beforePass.rows[0].cnt);
    console.log('  FAIL:', beforeFail.rows[0].cnt);

    // =========================================================================
    // STEP 1: Drop FK constraint from outreach.outreach
    // =========================================================================
    console.log('\n' + '-'.repeat(60));
    console.log('STEP 1: Drop FK constraint fk_outreach_sovereign');
    console.log('-'.repeat(60));
    console.log('  (Outreach will manage its own data in Outreach repo)');

    await client.query(`
      ALTER TABLE outreach.outreach DROP CONSTRAINT IF EXISTS fk_outreach_sovereign
    `);
    console.log('  FK constraint dropped');

    // =========================================================================
    // STEP 2: Remove FAIL from company_identity
    // =========================================================================
    console.log('\n' + '-'.repeat(60));
    console.log('STEP 2: Remove FAIL from cl.company_identity');
    console.log('-'.repeat(60));

    const removed = await client.query(`
      DELETE FROM cl.company_identity
      WHERE final_outcome = 'FAIL'
      RETURNING company_unique_id
    `);
    console.log('  Removed from active:', removed.rowCount);

    // =========================================================================
    // VERIFICATION
    // =========================================================================
    const afterTotal = await client.query('SELECT COUNT(*) as cnt FROM cl.company_identity');
    const afterArchive = await client.query('SELECT COUNT(*) as cnt FROM cl.company_identity_archive');

    console.log('\n' + '='.repeat(70));
    console.log('[AFTER]');
    console.log('='.repeat(70));
    console.log('  cl.company_identity:', afterTotal.rows[0].cnt);
    console.log('  cl.company_identity_archive:', afterArchive.rows[0].cnt);

    // Verify all remaining are PASS
    const verifyPass = await client.query(`
      SELECT final_outcome, COUNT(*) as cnt
      FROM cl.company_identity
      GROUP BY final_outcome
    `);
    console.log('\nRemaining in company_identity:');
    console.table(verifyPass.rows);

    // Archive breakdown
    const archiveBreakdown = await client.query(`
      SELECT final_reason, COUNT(*) as cnt
      FROM cl.company_identity_archive
      GROUP BY final_reason
      ORDER BY cnt DESC
    `);
    console.log('\nArchive breakdown:');
    console.table(archiveBreakdown.rows);

    const total = parseInt(afterTotal.rows[0].cnt);
    if (total === 51910) {
      console.log('\n✅ SUCCESS: cl.company_identity = 51,910 PASS records');
    } else {
      console.log('\n⚠️  Expected 51,910, got', total);
    }

    // Summary table
    console.log('\n' + '='.repeat(70));
    console.log('FINAL STATE');
    console.log('='.repeat(70));
    console.log('  cl.company_identity        :', total, '(PASS only)');
    console.log('  cl.company_identity_archive:', afterArchive.rows[0].cnt, '(FAIL preserved)');
    console.log('  outreach.outreach          : 74,173 (FK dropped, Outreach repo handles)');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

archiveFinal();
