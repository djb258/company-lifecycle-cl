// Explore Outreach schema structure for reconciliation
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function explore() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('='.repeat(70));
  console.log('OUTREACH SCHEMA EXPLORATION');
  console.log('='.repeat(70));

  // Get all schemas
  const schemas = await client.query(`
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    ORDER BY schema_name
  `);
  console.log('\nAll custom schemas:');
  console.table(schemas.rows);

  // Get Outreach schema tables
  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'outreach'
    ORDER BY table_name
  `);
  console.log('\nOutreach schema tables:');
  if (tables.rows.length === 0) {
    console.log('  (No tables found in outreach schema)');
  } else {
    console.table(tables.rows);
  }

  // Check for company tables in any schema
  const companyTables = await client.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_name ILIKE '%compan%'
    ORDER BY table_schema, table_name
  `);
  console.log('\nCompany-related tables across all schemas:');
  console.table(companyTables.rows);

  // Get CL schema tables for reference
  const clTables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'cl'
    ORDER BY table_name
  `);
  console.log('\nCL schema tables:');
  console.table(clTables.rows);

  // Check if there's already a link column in cl.company_identity
  const clColumns = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'cl' AND table_name = 'company_identity'
      AND column_name ILIKE '%outreach%'
    ORDER BY ordinal_position
  `);
  console.log('\nOutreach-related columns in cl.company_identity:');
  if (clColumns.rows.length === 0) {
    console.log('  (None found)');
  } else {
    console.table(clColumns.rows);
  }

  // Check current company_identity structure
  const identityCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'cl' AND table_name = 'company_identity'
    ORDER BY ordinal_position
  `);
  console.log('\ncl.company_identity columns:');
  console.table(identityCols.rows);

  await client.end();
}

explore().catch(console.error);
