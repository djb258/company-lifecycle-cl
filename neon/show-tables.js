// Show CL tables for Outreach handoff
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function showTables() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('===========================================');
  console.log('CL SOVEREIGN IDENTITY TABLES');
  console.log('===========================================\n');

  // Table counts
  const counts = {
    source: (await client.query('SELECT COUNT(*) FROM company.company_master')).rows[0].count,
    staging: (await client.query('SELECT COUNT(*) FROM cl.company_lifecycle_identity_staging')).rows[0].count,
    identity: (await client.query('SELECT COUNT(*) FROM cl.company_identity')).rows[0].count,
    bridge: (await client.query('SELECT COUNT(*) FROM cl.company_identity_bridge')).rows[0].count,
    ncIdentity: (await client.query("SELECT COUNT(*) FROM cl.company_identity WHERE lifecycle_run_id LIKE 'RUN-NC-%'")).rows[0].count
  };

  console.log('TABLE COUNTS:');
  console.log('  company.company_master (source):', counts.source);
  console.log('  cl.company_lifecycle_identity_staging:', counts.staging);
  console.log('  cl.company_identity (SOVEREIGN IDs):', counts.identity);
  console.log('  cl.company_identity_bridge:', counts.bridge);
  console.log('  NC companies (sovereign):', counts.ncIdentity);

  console.log('\n===========================================');
  console.log('SCHEMA FOR OUTREACH HANDOFF');
  console.log('===========================================\n');

  // Bridge table (what Outreach uses to join)
  console.log('>>> cl.company_identity_bridge (JOIN SURFACE) <<<');
  const bridgeCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'cl' AND table_name = 'company_identity_bridge'
    ORDER BY ordinal_position
  `);
  bridgeCols.rows.forEach(r => console.log('  ' + r.column_name.padEnd(20) + r.data_type.padEnd(20) + (r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL')));

  // Identity table
  console.log('\n>>> cl.company_identity (SOVEREIGN IDENTITY) <<<');
  const idCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'cl' AND table_name = 'company_identity'
    ORDER BY ordinal_position
  `);
  idCols.rows.forEach(r => console.log('  ' + r.column_name.padEnd(25) + r.data_type.padEnd(20) + (r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL')));

  console.log('\n===========================================');
  console.log('SAMPLE NC COMPANIES (5)');
  console.log('===========================================\n');

  const samples = await client.query(`
    SELECT
      i.company_unique_id as sovereign_id,
      i.company_name,
      i.company_domain,
      i.linkedin_company_url,
      b.source_company_id
    FROM cl.company_identity i
    JOIN cl.company_identity_bridge b ON i.company_unique_id = b.company_sov_id
    WHERE i.lifecycle_run_id LIKE 'RUN-NC-%'
    LIMIT 5
  `);

  samples.rows.forEach((r, idx) => {
    console.log((idx+1) + '. ' + r.company_name);
    console.log('   Sovereign ID: ' + r.sovereign_id);
    console.log('   Domain: ' + (r.company_domain || 'NULL'));
    console.log('   LinkedIn: ' + (r.linkedin_company_url || 'NULL'));
    console.log('   Source ID: ' + r.source_company_id);
    console.log('');
  });

  console.log('===========================================');
  console.log('OUTREACH QUERY PATTERN');
  console.log('===========================================\n');

  console.log(`-- Get all NC companies for outreach:
SELECT
  i.company_unique_id AS sovereign_id,
  i.company_name,
  i.company_domain,
  i.linkedin_company_url,
  i.company_fingerprint
FROM cl.company_identity i
WHERE i.lifecycle_run_id LIKE 'RUN-NC-%';

-- Join via bridge (canonical pattern):
SELECT
  b.company_sov_id,
  i.company_name,
  i.company_domain
FROM cl.company_identity_bridge b
JOIN cl.company_identity i ON b.company_sov_id = i.company_unique_id
WHERE i.lifecycle_run_id LIKE 'RUN-NC-%';
`);

  await client.end();
}

showTables().catch(console.error);
