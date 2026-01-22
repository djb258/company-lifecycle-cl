// ============================================================================
// ARCHIVE FAIL RECORDS V2 - Handle foreign key constraints
// ============================================================================
// Doctrine: No deletes. Archive preserves history.
// Handles: company_domains, domain_hierarchy, and other FK references
// ============================================================================
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function archiveFailRecords() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('='.repeat(70));
  console.log('ARCHIVE FAIL RECORDS V2 - WITH FK HANDLING');
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

    // Check foreign key dependencies
    console.log('\n' + '-'.repeat(60));
    console.log('CHECKING FOREIGN KEY DEPENDENCIES');
    console.log('-'.repeat(60));

    const fkDeps = await client.query(`
      SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'cl'
        AND ccu.table_name = 'company_identity'
    `);
    console.log('Tables referencing cl.company_identity:');
    console.table(fkDeps.rows);

    // Get FAIL company IDs for reference
    const failIds = await client.query(`
      SELECT company_unique_id FROM cl.company_identity WHERE final_outcome = 'FAIL'
    `);
    const failIdSet = new Set(failIds.rows.map(r => r.company_unique_id));
    console.log('\nFAIL company IDs to archive:', failIdSet.size);

    // Step 1: Create archive tables
    console.log('\n' + '-'.repeat(60));
    console.log('STEP 1: Create archive tables');
    console.log('-'.repeat(60));

    await client.query(`
      CREATE TABLE IF NOT EXISTS cl.company_identity_archive (
        LIKE cl.company_identity INCLUDING ALL
      )
    `);
    await client.query(`ALTER TABLE cl.company_identity_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT now()`);
    await client.query(`ALTER TABLE cl.company_identity_archive ADD COLUMN IF NOT EXISTS archive_reason TEXT`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cl.company_domains_archive (
        LIKE cl.company_domains INCLUDING ALL
      )
    `);
    await client.query(`ALTER TABLE cl.company_domains_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT now()`);
    await client.query(`ALTER TABLE cl.company_domains_archive ADD COLUMN IF NOT EXISTS archive_reason TEXT`);

    console.log('  Archive tables ready');

    // Step 2: Archive related company_domains records
    console.log('\n' + '-'.repeat(60));
    console.log('STEP 2: Archive related company_domains');
    console.log('-'.repeat(60));

    const archivedDomains = await client.query(`
      WITH to_archive AS (
        SELECT cd.* FROM cl.company_domains cd
        JOIN cl.company_identity ci ON cd.company_unique_id = ci.company_unique_id
        WHERE ci.final_outcome = 'FAIL'
      ),
      moved AS (
        INSERT INTO cl.company_domains_archive
        SELECT *, NOW(), 'FAIL_CLEANUP'
        FROM to_archive
        RETURNING company_unique_id
      )
      SELECT COUNT(*) as cnt FROM moved
    `);
    console.log('  Archived domain records:', archivedDomains.rows[0].cnt);

    // Delete from company_domains
    const deletedDomains = await client.query(`
      DELETE FROM cl.company_domains
      WHERE company_unique_id IN (
        SELECT company_unique_id FROM cl.company_identity WHERE final_outcome = 'FAIL'
      )
      RETURNING company_unique_id
    `);
    console.log('  Removed from company_domains:', deletedDomains.rowCount);

    // Step 3: Handle domain_hierarchy references
    console.log('\n' + '-'.repeat(60));
    console.log('STEP 3: Archive related domain_hierarchy');
    console.log('-'.repeat(60));

    // Check if domain_hierarchy_archive exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS cl.domain_hierarchy_archive (
        LIKE cl.domain_hierarchy INCLUDING ALL
      )
    `);
    await client.query(`ALTER TABLE cl.domain_hierarchy_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT now()`);
    await client.query(`ALTER TABLE cl.domain_hierarchy_archive ADD COLUMN IF NOT EXISTS archive_reason TEXT`);

    const archivedHierarchy = await client.query(`
      WITH to_archive AS (
        SELECT dh.* FROM cl.domain_hierarchy dh
        WHERE dh.parent_company_id IN (SELECT company_unique_id FROM cl.company_identity WHERE final_outcome = 'FAIL')
           OR dh.child_company_id IN (SELECT company_unique_id FROM cl.company_identity WHERE final_outcome = 'FAIL')
      ),
      moved AS (
        INSERT INTO cl.domain_hierarchy_archive
        SELECT *, NOW(), 'FAIL_CLEANUP'
        FROM to_archive
        RETURNING hierarchy_id
      )
      SELECT COUNT(*) as cnt FROM moved
    `);
    console.log('  Archived hierarchy records:', archivedHierarchy.rows[0].cnt);

    const deletedHierarchy = await client.query(`
      DELETE FROM cl.domain_hierarchy
      WHERE parent_company_id IN (SELECT company_unique_id FROM cl.company_identity WHERE final_outcome = 'FAIL')
         OR child_company_id IN (SELECT company_unique_id FROM cl.company_identity WHERE final_outcome = 'FAIL')
      RETURNING hierarchy_id
    `);
    console.log('  Removed from domain_hierarchy:', deletedHierarchy.rowCount);

    // Step 4: Archive FAIL company_identity records
    console.log('\n' + '-'.repeat(60));
    console.log('STEP 4: Archive FAIL company_identity records');
    console.log('-'.repeat(60));

    // Check if already archived (from previous run)
    const alreadyArchived = await client.query(`SELECT COUNT(*) as cnt FROM cl.company_identity_archive`);
    console.log('  Already in archive:', alreadyArchived.rows[0].cnt);

    // Archive if not already done
    if (parseInt(alreadyArchived.rows[0].cnt) < 22263) {
      const archived = await client.query(`
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
          final_outcome, final_reason, NOW(), 'FAIL_CLEANUP'
        FROM cl.company_identity
        WHERE final_outcome = 'FAIL'
        ON CONFLICT DO NOTHING
        RETURNING company_unique_id
      `);
      console.log('  Newly archived:', archived.rowCount);
    }

    // Step 5: Remove FAIL records from active table
    console.log('\n' + '-'.repeat(60));
    console.log('STEP 5: Remove FAIL from company_identity');
    console.log('-'.repeat(60));

    const removed = await client.query(`
      DELETE FROM cl.company_identity
      WHERE final_outcome = 'FAIL'
      RETURNING company_unique_id
    `);
    console.log('  Removed from active:', removed.rowCount);

    // Final verification
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
