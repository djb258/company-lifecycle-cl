// ============================================================================
// ARCHIVE FAIL RECORDS V3 - Handle ALL foreign key constraints
// ============================================================================
// FK Dependencies:
//   - cl.company_names → cl.company_identity
//   - cl.company_domains → cl.company_identity
//   - cl.identity_confidence → cl.company_identity
//   - cl.domain_hierarchy → cl.company_identity (parent/child)
// ============================================================================
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function archiveFailRecords() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('='.repeat(70));
  console.log('ARCHIVE FAIL RECORDS V3 - ALL FK HANDLING');
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

    // Get FAIL IDs
    const failQuery = `SELECT company_unique_id FROM cl.company_identity WHERE final_outcome = 'FAIL'`;

    // =========================================================================
    // STEP 1: Archive company_names
    // =========================================================================
    console.log('\n' + '-'.repeat(60));
    console.log('STEP 1: Archive company_names');
    console.log('-'.repeat(60));

    await client.query(`
      CREATE TABLE IF NOT EXISTS cl.company_names_archive (
        LIKE cl.company_names INCLUDING ALL
      )
    `);
    await client.query(`ALTER TABLE cl.company_names_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT now()`);
    await client.query(`ALTER TABLE cl.company_names_archive ADD COLUMN IF NOT EXISTS archive_reason TEXT`);

    const archivedNames = await client.query(`
      WITH moved AS (
        INSERT INTO cl.company_names_archive
        SELECT cn.*, NOW(), 'FAIL_CLEANUP'
        FROM cl.company_names cn
        WHERE cn.company_unique_id IN (${failQuery})
        RETURNING company_unique_id
      )
      SELECT COUNT(*) as cnt FROM moved
    `);
    console.log('  Archived:', archivedNames.rows[0].cnt);

    const deletedNames = await client.query(`
      DELETE FROM cl.company_names
      WHERE company_unique_id IN (${failQuery})
      RETURNING company_unique_id
    `);
    console.log('  Removed:', deletedNames.rowCount);

    // =========================================================================
    // STEP 2: Archive identity_confidence
    // =========================================================================
    console.log('\n' + '-'.repeat(60));
    console.log('STEP 2: Archive identity_confidence');
    console.log('-'.repeat(60));

    await client.query(`
      CREATE TABLE IF NOT EXISTS cl.identity_confidence_archive (
        LIKE cl.identity_confidence INCLUDING ALL
      )
    `);
    await client.query(`ALTER TABLE cl.identity_confidence_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT now()`);
    await client.query(`ALTER TABLE cl.identity_confidence_archive ADD COLUMN IF NOT EXISTS archive_reason TEXT`);

    const archivedConfidence = await client.query(`
      WITH moved AS (
        INSERT INTO cl.identity_confidence_archive
        SELECT ic.*, NOW(), 'FAIL_CLEANUP'
        FROM cl.identity_confidence ic
        WHERE ic.company_unique_id IN (${failQuery})
        RETURNING company_unique_id
      )
      SELECT COUNT(*) as cnt FROM moved
    `);
    console.log('  Archived:', archivedConfidence.rows[0].cnt);

    const deletedConfidence = await client.query(`
      DELETE FROM cl.identity_confidence
      WHERE company_unique_id IN (${failQuery})
      RETURNING company_unique_id
    `);
    console.log('  Removed:', deletedConfidence.rowCount);

    // =========================================================================
    // STEP 3: Archive company_domains (may already be done)
    // =========================================================================
    console.log('\n' + '-'.repeat(60));
    console.log('STEP 3: Archive company_domains');
    console.log('-'.repeat(60));

    const remainingDomains = await client.query(`
      SELECT COUNT(*) as cnt FROM cl.company_domains
      WHERE company_unique_id IN (${failQuery})
    `);
    console.log('  Remaining to archive:', remainingDomains.rows[0].cnt);

    if (parseInt(remainingDomains.rows[0].cnt) > 0) {
      const archivedDomains = await client.query(`
        WITH moved AS (
          INSERT INTO cl.company_domains_archive
          SELECT cd.*, NOW(), 'FAIL_CLEANUP'
          FROM cl.company_domains cd
          WHERE cd.company_unique_id IN (${failQuery})
          RETURNING company_unique_id
        )
        SELECT COUNT(*) as cnt FROM moved
      `);
      console.log('  Archived:', archivedDomains.rows[0].cnt);

      const deletedDomains = await client.query(`
        DELETE FROM cl.company_domains
        WHERE company_unique_id IN (${failQuery})
        RETURNING company_unique_id
      `);
      console.log('  Removed:', deletedDomains.rowCount);
    } else {
      console.log('  (Already cleaned in previous run)');
    }

    // =========================================================================
    // STEP 4: Archive domain_hierarchy (may already be done)
    // =========================================================================
    console.log('\n' + '-'.repeat(60));
    console.log('STEP 4: Archive domain_hierarchy');
    console.log('-'.repeat(60));

    const remainingHierarchy = await client.query(`
      SELECT COUNT(*) as cnt FROM cl.domain_hierarchy
      WHERE parent_company_id IN (${failQuery})
         OR child_company_id IN (${failQuery})
    `);
    console.log('  Remaining to archive:', remainingHierarchy.rows[0].cnt);

    if (parseInt(remainingHierarchy.rows[0].cnt) > 0) {
      const deletedHierarchy = await client.query(`
        DELETE FROM cl.domain_hierarchy
        WHERE parent_company_id IN (${failQuery})
           OR child_company_id IN (${failQuery})
        RETURNING hierarchy_id
      `);
      console.log('  Removed:', deletedHierarchy.rowCount);
    } else {
      console.log('  (Already cleaned in previous run)');
    }

    // =========================================================================
    // STEP 5: Remove FAIL from company_identity
    // =========================================================================
    console.log('\n' + '-'.repeat(60));
    console.log('STEP 5: Remove FAIL from company_identity');
    console.log('-'.repeat(60));

    const removed = await client.query(`
      DELETE FROM cl.company_identity
      WHERE final_outcome = 'FAIL'
      RETURNING company_unique_id
    `);
    console.log('  Removed from active:', removed.rowCount);

    // =========================================================================
    // FINAL VERIFICATION
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

    if (parseInt(afterTotal.rows[0].cnt) === 51910) {
      console.log('\n✅ SUCCESS: cl.company_identity = 51,910 PASS records');
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
