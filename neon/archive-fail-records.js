// ============================================================================
// ARCHIVE FAIL RECORDS - Move FAIL companies to archive table
// ============================================================================
// Doctrine: No deletes. Archive preserves history.
//           cl.company_identity = PASS only (51,910)
//           cl.company_identity_archive = FAIL records for future reference
// ============================================================================
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function archiveFailRecords() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('='.repeat(70));
  console.log('ARCHIVE FAIL RECORDS');
  console.log('='.repeat(70));
  console.log('Doctrine: No deletes. Archive preserves history.\n');

  try {
    // Before counts
    const beforeTotal = await client.query('SELECT COUNT(*) as cnt FROM cl.company_identity');
    const beforePass = await client.query(`SELECT COUNT(*) as cnt FROM cl.company_identity WHERE final_outcome = 'PASS'`);
    const beforeFail = await client.query(`SELECT COUNT(*) as cnt FROM cl.company_identity WHERE final_outcome = 'FAIL'`);

    console.log('[BEFORE]');
    console.log('  Total in company_identity:', beforeTotal.rows[0].cnt);
    console.log('  PASS:', beforePass.rows[0].cnt);
    console.log('  FAIL:', beforeFail.rows[0].cnt);

    // Step 1: Create archive table if not exists
    console.log('\n' + '-'.repeat(60));
    console.log('STEP 1: Create archive table');
    console.log('-'.repeat(60));

    await client.query(`
      CREATE TABLE IF NOT EXISTS cl.company_identity_archive (
        LIKE cl.company_identity INCLUDING ALL
      )
    `);

    // Add archive metadata columns
    await client.query(`ALTER TABLE cl.company_identity_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT now()`);
    await client.query(`ALTER TABLE cl.company_identity_archive ADD COLUMN IF NOT EXISTS archive_reason TEXT`);

    console.log('  Archive table ready: cl.company_identity_archive');

    // Step 2: Move FAIL records to archive
    console.log('\n' + '-'.repeat(60));
    console.log('STEP 2: Move FAIL records to archive');
    console.log('-'.repeat(60));

    const archived = await client.query(`
      WITH moved AS (
        INSERT INTO cl.company_identity_archive (
          company_unique_id, company_name, company_domain, linkedin_company_url,
          source_system, created_at, company_fingerprint, lifecycle_run_id,
          existence_verified, verification_run_id, verified_at, domain_status_code,
          name_match_score, state_match_result, canonical_name, state_verified,
          employee_count_band, identity_pass, identity_status, last_pass_at,
          eligibility_status, exclusion_reason, entity_role, sovereign_company_id,
          final_outcome, final_reason, archived_at, archive_reason
        )
        SELECT
          company_unique_id, company_name, company_domain, linkedin_company_url,
          source_system, created_at, company_fingerprint, lifecycle_run_id,
          existence_verified, verification_run_id, verified_at, domain_status_code,
          name_match_score, state_match_result, canonical_name, state_verified,
          employee_count_band, identity_pass, identity_status, last_pass_at,
          eligibility_status, exclusion_reason, entity_role, sovereign_company_id,
          final_outcome, final_reason, NOW(), 'FAIL_CLEANUP_' || NOW()::DATE
        FROM cl.company_identity
        WHERE final_outcome = 'FAIL'
        RETURNING company_unique_id
      )
      SELECT COUNT(*) as cnt FROM moved
    `);
    console.log('  Archived FAIL records:', archived.rows[0].cnt);

    // Step 3: Remove FAIL records from active table
    console.log('\n' + '-'.repeat(60));
    console.log('STEP 3: Remove FAIL records from active table');
    console.log('-'.repeat(60));

    const removed = await client.query(`
      DELETE FROM cl.company_identity
      WHERE final_outcome = 'FAIL'
      RETURNING company_unique_id
    `);
    console.log('  Removed from active:', removed.rowCount);

    // After counts
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
    console.log('\nArchive breakdown by reason:');
    console.table(archiveBreakdown.rows);

    if (parseInt(afterTotal.rows[0].cnt) === 51910) {
      console.log('\n✅ SUCCESS: cl.company_identity now has exactly 51,910 PASS records');
    } else {
      console.log('\n⚠️  Count mismatch - expected 51,910, got', afterTotal.rows[0].cnt);
    }

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

archiveFailRecords();
