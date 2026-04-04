// ============================================================================
// APPLY MIGRATION 008: LIFECYCLE POINTER REGISTRY
// ============================================================================
// Extends company_identity with write-once pointers for Outreach, Sales, Client.
// ============================================================================
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function applyMigration() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('='.repeat(70));
  console.log('MIGRATION 008: LIFECYCLE POINTER REGISTRY');
  console.log('='.repeat(70));

  try {
    // Read migration SQL
    const migrationPath = join(__dirname, 'migrations', '008_lifecycle_pointer_registry.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Before state
    const beforeCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'cl' AND table_name = 'company_identity'
      ORDER BY ordinal_position
    `);
    console.log('\n[BEFORE] company_identity columns:', beforeCols.rows.length);

    // Apply migration
    console.log('\nApplying migration...');
    await client.query(migrationSQL);
    console.log('Migration applied.');

    // After state
    const afterCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'cl' AND table_name = 'company_identity'
      ORDER BY ordinal_position
    `);
    console.log('\n[AFTER] company_identity columns:', afterCols.rows.length);

    // Show new columns
    const newCols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'cl' AND table_name = 'company_identity'
        AND column_name IN ('outreach_id', 'sales_process_id', 'client_id',
                            'outreach_attached_at', 'sales_opened_at', 'client_promoted_at')
      ORDER BY ordinal_position
    `);
    console.log('\nNew lifecycle pointer columns:');
    console.table(newCols.rows);

    // Verify trigger exists
    const triggers = await client.query(`
      SELECT trigger_name, event_manipulation, action_timing
      FROM information_schema.triggers
      WHERE trigger_schema = 'cl' AND event_object_table = 'company_identity'
    `);
    console.log('\nTriggers on company_identity:');
    console.table(triggers.rows);

    // Verify view exists
    const viewCheck = await client.query(`
      SELECT COUNT(*) as cnt FROM cl.v_company_lifecycle_status
    `);
    console.log('\nv_company_lifecycle_status rows:', viewCheck.rows[0].cnt);

    // Sample view output
    const viewSample = await client.query(`
      SELECT sovereign_company_id, company_name, lifecycle_stage,
             has_outreach, has_sales, is_client
      FROM cl.v_company_lifecycle_status
      LIMIT 5
    `);
    console.log('\nSample view output:');
    console.table(viewSample.rows);

    console.log('\n' + '='.repeat(70));
    console.log('MIGRATION 008 COMPLETE');
    console.log('='.repeat(70));

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

applyMigration();
