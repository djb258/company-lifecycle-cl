// Hub Reorganization Migration Runner
// Executes migrations in order to reorganize database into 4 hubs

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function runMigration(client, filename) {
  const filePath = path.join(__dirname, 'migrations', filename);
  const sql = fs.readFileSync(filePath, 'utf8');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${filename}`);
  console.log('='.repeat(60));

  try {
    await client.query(sql);
    console.log(`SUCCESS: ${filename}`);
    return true;
  } catch (error) {
    console.error(`ERROR in ${filename}:`, error.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipBloatDrop = args.includes('--skip-bloat-drop');
  const skipErrorMigration = args.includes('--skip-error-migration');

  console.log('='.repeat(60));
  console.log('HUB REORGANIZATION MIGRATION');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log(`Skip Error Migration: ${skipErrorMigration}`);
  console.log(`Skip Bloat Drop: ${skipBloatDrop}`);
  console.log('');

  if (dryRun) {
    console.log('DRY RUN MODE - No changes will be made');
    console.log('');
    console.log('Migrations that would run:');
    console.log('  1. 003_cl_hub_migration.sql - CL sovereign identity hub');
    if (!skipErrorMigration) {
      console.log('  2. 003a_migrate_error_data.sql - Preserve error data');
    }
    if (!skipBloatDrop) {
      console.log('  3. 004_drop_bloat_tables.sql - Remove v1 tables');
    }
    console.log('');
    console.log('NOTE: Outreach/Sales/Client schemas are handled by separate repo.');
    console.log('See docs/OUTREACH_MIGRATION_GUIDE.md for handoff instructions.');
    console.log('');
    console.log('RECOMMENDED: Run pre-migration-audit.js first!');
    console.log('  node neon/pre-migration-audit.js');
    console.log('');
    console.log('To execute, run without --dry-run flag');
    return;
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    // Start transaction
    await client.query('BEGIN');

    // Step 1: Run CL hub migration (sovereign identity)
    const hubSuccess = await runMigration(client, '003_cl_hub_migration.sql');
    if (!hubSuccess) {
      await client.query('ROLLBACK');
      console.error('\nMigration failed. Changes rolled back.');
      process.exit(1);
    }

    // Step 2: Migrate error data (preserves v1 errors before drop)
    if (!skipErrorMigration) {
      const errorSuccess = await runMigration(client, '003a_migrate_error_data.sql');
      if (!errorSuccess) {
        await client.query('ROLLBACK');
        console.error('\nError migration failed. Changes rolled back.');
        process.exit(1);
      }
    } else {
      console.log('\nSkipping error data migration (--skip-error-migration)');
    }

    // Step 3: Run bloat removal (optional)
    if (!skipBloatDrop) {
      const bloatSuccess = await runMigration(client, '004_drop_bloat_tables.sql');
      if (!bloatSuccess) {
        await client.query('ROLLBACK');
        console.error('\nMigration failed. Changes rolled back.');
        process.exit(1);
      }
    } else {
      console.log('\nSkipping bloat table removal (--skip-bloat-drop)');
    }

    // Commit transaction
    await client.query('COMMIT');

    // Verification
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION');
    console.log('='.repeat(60));

    // List schemas
    const schemas = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name IN ('cl', 'outreach', 'sales', 'client')
      ORDER BY schema_name
    `);
    console.log('\nSchemas:');
    schemas.rows.forEach(r => console.log(`  - ${r.schema_name}`));

    // List tables per schema
    const tables = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema IN ('cl', 'outreach', 'sales', 'client')
      ORDER BY table_schema, table_name
    `);

    console.log('\nTables by schema:');
    let currentSchema = '';
    tables.rows.forEach(r => {
      if (r.table_schema !== currentSchema) {
        currentSchema = r.table_schema;
        console.log(`\n  ${currentSchema}:`);
      }
      console.log(`    - ${r.table_name}`);
    });

    // Gate summary
    try {
      const summary = await client.query('SELECT * FROM cl.v_identity_gate_summary');
      console.log('\nIdentity Gate Summary:');
      console.log(`  Total: ${summary.rows[0].total_companies}`);
      console.log(`  Pass: ${summary.rows[0].pass_count}`);
      console.log(`  Pending: ${summary.rows[0].pending_count}`);
      console.log(`  Fail: ${summary.rows[0].fail_count}`);
      console.log(`  Pass %: ${summary.rows[0].pass_pct}%`);
    } catch (e) {
      console.log('\nCould not get gate summary (table may be empty)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Fatal error:', error.message);
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      // ignore rollback errors
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
