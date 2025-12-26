// CL Schema Migration Runner
// Run with: node neon/run-migration.js

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function runMigration() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to Neon database');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '001_cl_company_identity.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running CL schema migration...');
    await client.query(sql);

    console.log('Migration completed successfully');

    // Verify
    const result = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema = 'cl'
    `);

    console.log('CL schema tables:', result.rows);

  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
