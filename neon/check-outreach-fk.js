// Check outreach FK dependency on FAIL companies
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function check() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('='.repeat(70));
  console.log('OUTREACH FK DEPENDENCY CHECK');
  console.log('='.repeat(70));

  // Check FK constraint details
  const fkDetails = await client.query(`
    SELECT
      tc.constraint_name,
      tc.table_schema,
      tc.table_name,
      kcu.column_name,
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'fk_outreach_sovereign'
  `);
  console.log('\nFK constraint details:');
  console.table(fkDetails.rows);

  // Check outreach.outreach columns
  const outreachCols = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'outreach' AND table_name = 'outreach'
    ORDER BY ordinal_position
  `);
  console.log('\noutreach.outreach columns:');
  console.table(outreachCols.rows);

  // How many outreach records reference FAIL companies?
  const failRefs = await client.query(`
    SELECT COUNT(*) as cnt
    FROM outreach.outreach o
    WHERE EXISTS (
      SELECT 1 FROM cl.company_identity ci
      WHERE ci.company_unique_id = o.sovereign_company_id
        AND ci.final_outcome = 'FAIL'
    )
  `);
  console.log('\nOutreach records referencing FAIL companies:', failRefs.rows[0].cnt);

  // Total outreach records
  const totalOutreach = await client.query(`SELECT COUNT(*) as cnt FROM outreach.outreach`);
  console.log('Total outreach records:', totalOutreach.rows[0].cnt);

  // Outreach records with sovereign_company_id
  const withSovereign = await client.query(`
    SELECT COUNT(*) as cnt FROM outreach.outreach WHERE sovereign_company_id IS NOT NULL
  `);
  console.log('Outreach records with sovereign_company_id:', withSovereign.rows[0].cnt);

  await client.end();
}

check().catch(console.error);
