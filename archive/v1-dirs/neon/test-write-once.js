// ============================================================================
// TEST: WRITE-ONCE TRIGGER ENFORCEMENT
// ============================================================================
// Verifies that lifecycle pointer columns cannot be overwritten once set.
// ============================================================================
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function testWriteOnce() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('='.repeat(70));
  console.log('TEST: WRITE-ONCE TRIGGER ENFORCEMENT');
  console.log('='.repeat(70));

  try {
    // Get a test company
    const testCompany = await client.query(`
      SELECT company_unique_id, company_name, outreach_id
      FROM cl.company_identity
      WHERE outreach_id IS NULL
      LIMIT 1
    `);

    if (testCompany.rows.length === 0) {
      console.log('No test company available');
      return;
    }

    const companyId = testCompany.rows[0].company_unique_id;
    const companyName = testCompany.rows[0].company_name;
    console.log('\nTest company:', companyName);
    console.log('ID:', companyId);

    // TEST 1: Set outreach_id (should succeed)
    console.log('\n--- TEST 1: Initial write (should succeed) ---');
    const testOutreachId = '11111111-1111-1111-1111-111111111111';
    try {
      await client.query(`
        UPDATE cl.company_identity
        SET outreach_id = $1
        WHERE company_unique_id = $2
      `, [testOutreachId, companyId]);
      console.log('✓ Initial write succeeded');

      // Verify timestamp was auto-set
      const afterWrite = await client.query(`
        SELECT outreach_id, outreach_attached_at
        FROM cl.company_identity
        WHERE company_unique_id = $1
      `, [companyId]);
      console.log('  outreach_id:', afterWrite.rows[0].outreach_id);
      console.log('  outreach_attached_at:', afterWrite.rows[0].outreach_attached_at);
    } catch (err) {
      console.log('✗ Initial write failed:', err.message);
    }

    // TEST 2: Try to overwrite outreach_id (should FAIL)
    console.log('\n--- TEST 2: Overwrite attempt (should FAIL) ---');
    const newOutreachId = '22222222-2222-2222-2222-222222222222';
    try {
      await client.query(`
        UPDATE cl.company_identity
        SET outreach_id = $1
        WHERE company_unique_id = $2
      `, [newOutreachId, companyId]);
      console.log('✗ Overwrite succeeded (TRIGGER FAILED!)');
    } catch (err) {
      console.log('✓ Overwrite blocked:', err.message);
    }

    // TEST 3: Setting same value (should succeed - no actual change)
    console.log('\n--- TEST 3: Same value (should succeed) ---');
    try {
      await client.query(`
        UPDATE cl.company_identity
        SET outreach_id = $1
        WHERE company_unique_id = $2
      `, [testOutreachId, companyId]);
      console.log('✓ Same value write succeeded (no-op)');
    } catch (err) {
      console.log('✗ Same value write failed:', err.message);
    }

    // TEST 4: Setting NULL (should FAIL - can't unset)
    console.log('\n--- TEST 4: Set to NULL (should FAIL) ---');
    try {
      await client.query(`
        UPDATE cl.company_identity
        SET outreach_id = NULL
        WHERE company_unique_id = $1
      `, [companyId]);
      console.log('✗ NULL write succeeded (TRIGGER FAILED!)');
    } catch (err) {
      console.log('✓ NULL write blocked:', err.message);
    }

    // CLEANUP: Reset test data
    console.log('\n--- CLEANUP ---');
    // Note: We can't reset via UPDATE due to trigger, so we use a direct approach
    await client.query(`
      UPDATE cl.company_identity
      SET outreach_id = NULL, outreach_attached_at = NULL
      WHERE company_unique_id = $1
    `, [companyId]).catch(() => {
      // Expected to fail due to trigger - need to disable trigger temporarily
    });

    // Disable trigger, reset, re-enable
    await client.query(`ALTER TABLE cl.company_identity DISABLE TRIGGER trg_write_once_pointers`);
    await client.query(`
      UPDATE cl.company_identity
      SET outreach_id = NULL, outreach_attached_at = NULL
      WHERE company_unique_id = $1
    `, [companyId]);
    await client.query(`ALTER TABLE cl.company_identity ENABLE TRIGGER trg_write_once_pointers`);
    console.log('Test data reset');

    console.log('\n' + '='.repeat(70));
    console.log('WRITE-ONCE TESTS COMPLETE');
    console.log('='.repeat(70));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

testWriteOnce();
