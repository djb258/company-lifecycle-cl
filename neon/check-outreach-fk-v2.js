// Check outreach FK dependency - correct column name
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

  // Total outreach records
  const totalOutreach = await client.query(`SELECT COUNT(*) as cnt FROM outreach.outreach`);
  console.log('\nTotal outreach.outreach records:', totalOutreach.rows[0].cnt);

  // Outreach records with sovereign_id
  const withSovereign = await client.query(`
    SELECT COUNT(*) as cnt FROM outreach.outreach WHERE sovereign_id IS NOT NULL
  `);
  console.log('With sovereign_id:', withSovereign.rows[0].cnt);

  // How many outreach records reference FAIL companies?
  const failRefs = await client.query(`
    SELECT COUNT(*) as cnt
    FROM outreach.outreach o
    JOIN cl.company_identity ci ON ci.company_unique_id = o.sovereign_id
    WHERE ci.final_outcome = 'FAIL'
  `);
  console.log('Referencing FAIL companies:', failRefs.rows[0].cnt);

  // How many reference PASS companies?
  const passRefs = await client.query(`
    SELECT COUNT(*) as cnt
    FROM outreach.outreach o
    JOIN cl.company_identity ci ON ci.company_unique_id = o.sovereign_id
    WHERE ci.final_outcome = 'PASS'
  `);
  console.log('Referencing PASS companies:', passRefs.rows[0].cnt);

  // Sample of FAIL references
  if (parseInt(failRefs.rows[0].cnt) > 0) {
    const samples = await client.query(`
      SELECT o.outreach_id, o.sovereign_id, o.domain, ci.company_name, ci.final_reason
      FROM outreach.outreach o
      JOIN cl.company_identity ci ON ci.company_unique_id = o.sovereign_id
      WHERE ci.final_outcome = 'FAIL'
      LIMIT 5
    `);
    console.log('\nSample FAIL references:');
    console.table(samples.rows);
  }

  console.log('\n' + '-'.repeat(70));
  console.log('RECOMMENDATION:');
  console.log('-'.repeat(70));
  console.log('Since Outreach will be managed in Outreach repo:');
  console.log('  1. Drop FK constraint fk_outreach_sovereign');
  console.log('  2. Let Outreach handle its own data cleanup');
  console.log('  3. CL becomes authoritative for company_identity only');

  await client.end();
}

check().catch(console.error);
