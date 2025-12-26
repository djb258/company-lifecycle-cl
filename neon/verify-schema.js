// CL Schema Verification
import pg from 'pg';

const { Client } = pg;

const connectionString =
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function verify() {
  const client = new Client({ connectionString });

  try {
    await client.connect();

    // Check columns
    console.log('\n=== CL.COMPANY_IDENTITY COLUMNS ===');
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'cl' AND table_name = 'company_identity'
      ORDER BY ordinal_position
    `);
    console.table(cols.rows);

    // Check constraints
    console.log('\n=== CONSTRAINTS ===');
    const constraints = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'cl' AND table_name = 'company_identity'
    `);
    console.table(constraints.rows);

    // Check indexes
    console.log('\n=== INDEXES ===');
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'cl' AND tablename = 'company_identity'
    `);
    console.table(indexes.rows);

    // Test admission gate - valid insert
    console.log('\n=== TEST: Valid Insert (with domain) ===');
    const validInsert = await client.query(`
      INSERT INTO cl.company_identity (company_name, company_domain, source_system)
      VALUES ('Test Corp', 'testcorp.com', 'migration_test')
      RETURNING company_unique_id, company_name, company_domain
    `);
    console.log('Inserted:', validInsert.rows[0]);

    // Test admission gate - invalid insert (should fail)
    console.log('\n=== TEST: Invalid Insert (no domain or linkedin) ===');
    try {
      await client.query(`
        INSERT INTO cl.company_identity (company_name, source_system)
        VALUES ('Bad Corp', 'migration_test')
      `);
      console.log('ERROR: Should have failed!');
    } catch (err) {
      console.log('Correctly rejected:', err.message);
    }

    // Clean up test data
    await client.query(`DELETE FROM cl.company_identity WHERE source_system = 'migration_test'`);
    console.log('\nTest data cleaned up.');

  } finally {
    await client.end();
  }
}

verify();
