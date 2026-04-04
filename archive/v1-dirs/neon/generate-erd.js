// Generate ERD for CL schema
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function generateERD() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('='.repeat(70));
  console.log('CL SCHEMA ERD - ' + new Date().toISOString().split('T')[0]);
  console.log('='.repeat(70));

  // Get all CL tables
  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'cl'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  console.log('\n## TABLES\n');

  for (const table of tables.rows) {
    const tableName = table.table_name;

    // Get columns
    const columns = await client.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'cl' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    // Get row count
    const countResult = await client.query(`SELECT COUNT(*) as cnt FROM cl.${tableName}`);
    const rowCount = countResult.rows[0].cnt;

    // Get primary key
    const pk = await client.query(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'cl'
        AND tc.table_name = $1
        AND tc.constraint_type = 'PRIMARY KEY'
    `, [tableName]);

    const pkCol = pk.rows.length > 0 ? pk.rows[0].column_name : null;

    console.log(`### cl.${tableName} (${rowCount} rows)`);
    console.log('| Column | Type | Nullable | PK |');
    console.log('|--------|------|----------|-----|');

    for (const col of columns.rows) {
      const isPK = col.column_name === pkCol ? '✓' : '';
      const nullable = col.is_nullable === 'YES' ? 'YES' : 'NO';
      let dataType = col.data_type;
      if (dataType === 'character varying') dataType = 'varchar';
      if (dataType === 'timestamp with time zone') dataType = 'timestamptz';
      console.log(`| ${col.column_name} | ${dataType} | ${nullable} | ${isPK} |`);
    }
    console.log('');
  }

  // Get views
  const views = await client.query(`
    SELECT table_name
    FROM information_schema.views
    WHERE table_schema = 'cl'
    ORDER BY table_name
  `);

  console.log('\n## VIEWS\n');
  for (const view of views.rows) {
    const countResult = await client.query(`SELECT COUNT(*) as cnt FROM cl.${view.table_name}`);
    console.log(`- cl.${view.table_name} (${countResult.rows[0].cnt} rows)`);
  }

  // Get foreign keys
  const fks = await client.query(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'cl'
    ORDER BY tc.table_name
  `);

  console.log('\n## FOREIGN KEYS\n');
  console.log('```');
  for (const fk of fks.rows) {
    console.log(`cl.${fk.table_name}.${fk.column_name} → cl.${fk.foreign_table_name}.${fk.foreign_column_name}`);
  }
  console.log('```');

  // Visual ERD
  console.log('\n## VISUAL ERD\n');
  console.log('```');
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                     CL SCHEMA (Company Lifecycle)               │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log('  ┌──────────────────────────┐');
  console.log('  │   company_identity       │  ← MASTER TABLE (51,910 PASS)');
  console.log('  │   ══════════════════     │');
  console.log('  │   company_unique_id [PK] │');
  console.log('  │   sovereign_company_id   │');
  console.log('  │   company_name           │');
  console.log('  │   company_domain         │');
  console.log('  │   linkedin_company_url   │');
  console.log('  │   final_outcome = PASS   │');
  console.log('  │   entity_role            │');
  console.log('  │   eligibility_status     │');
  console.log('  └───────────┬──────────────┘');
  console.log('              │');
  console.log('    ┌─────────┼─────────┬─────────────┐');
  console.log('    │         │         │             │');
  console.log('    ▼         ▼         ▼             ▼');
  console.log('┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐');
  console.log('│company │ │company │ │identity  │ │domain        │');
  console.log('│_names  │ │_domains│ │_confidence│ │_hierarchy    │');
  console.log('└────────┘ └────────┘ └──────────┘ └──────────────┘');
  console.log('');
  console.log('  ┌──────────────────────────┐');
  console.log('  │ company_identity_archive │  ← ARCHIVED FAIL (22,263)');
  console.log('  │   final_outcome = FAIL   │');
  console.log('  └──────────────────────────┘');
  console.log('');
  console.log('  ┌──────────────────────────┐');
  console.log('  │     cl_errors_archive    │  ← ARCHIVED ERRORS (16,103)');
  console.log('  └──────────────────────────┘');
  console.log('');
  console.log('  ┌──────────────────────────┐');
  console.log('  │       cl_errors          │  ← WORK QUEUE (0 at steady state)');
  console.log('  └──────────────────────────┘');
  console.log('```');

  await client.end();
}

generateERD().catch(console.error);
