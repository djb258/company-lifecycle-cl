// Apply unique constraint to cl.cl_errors
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function applyConstraint() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Check if constraint already exists
    const existing = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'cl'
        AND table_name = 'cl_errors'
        AND constraint_type = 'UNIQUE'
    `);

    if (existing.rows.some(r => r.constraint_name === 'uq_cl_errors_company_pass_reason')) {
      console.log('Constraint uq_cl_errors_company_pass_reason already exists. Skipping.');
      return;
    }

    // Read and execute migration
    const migrationPath = path.join(__dirname, 'migrations', '005_cl_errors_unique_constraint.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying unique constraint...');
    await client.query(sql);
    console.log('Constraint applied successfully!\n');

    // Verify
    const verify = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'cl'
        AND table_name = 'cl_errors'
        AND constraint_type = 'UNIQUE'
    `);
    console.log('Unique constraints on cl.cl_errors:');
    console.table(verify.rows);

  } catch (err) {
    console.error('Error:', err.message);
    if (err.message.includes('duplicate key')) {
      console.error('\nThere are still duplicates in the table. Run fix-duplicate-errors.js first.');
    }
  } finally {
    await client.end();
  }
}

applyConstraint();
